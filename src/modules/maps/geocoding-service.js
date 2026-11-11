import { createHash } from "node:crypto";
import {
    GEOCODING_CACHE_KEY_PREFIX,
    GEOCODING_COORDINATE_DECIMALS,
    GEOCODING_FOUND_CACHE_TTL_SECONDS,
    GEOCODING_NOT_FOUND_CACHE_TTL_SECONDS,
    GEOCODING_RATE_LIMIT,
    NOMINATIM_MAX_THROTTLE_ATTEMPTS,
    NOMINATIM_MIN_INTERVAL_MS,
    NOMINATIM_THROTTLE_KEY,
} from "../../constants/geocoding.js";
import { Decimal } from "../../generated/prisma/internal/prismaNamespace.ts";
import {
    ERROR_CODES,
    NotFoundError,
    RateLimitError,
    ServiceUnavailableError,
} from "../../lib/errors.js";
import { logger as defaultLogger, serializeError } from "../../lib/logger.js";
import { createRateLimiter } from "../../lib/rate-limiter.js";
import { getRedis as defaultGetRedis } from "../../lib/redis.js";
import { normalizeZipCode } from "../../utils/zip-code.js";
import { nominatimGateway } from "./nominatim-gateway.js";

export const GEOCODING_RATE_LIMITED_MESSAGE =
    "Muitas consultas de endereço. Tente novamente em alguns minutos.";
export const GEOCODING_NOT_FOUND_MESSAGE =
    "Não encontramos esse endereço no mapa. Confira os dados.";
export const GEOCODING_UNAVAILABLE_MESSAGE =
    "Não foi possível localizar o endereço agora. Tente novamente em instantes.";

const NOT_FOUND_CACHE_VALUE = "NOT_FOUND";
const LATITUDE_LIMIT = 90;
const LONGITUDE_LIMIT = 180;
const COORDINATE_PATTERN = /^-?\d{1,3}(\.\d+)?$/;
const ADDRESS_KEY_FIELDS = [
    "zipCode",
    "street",
    "number",
    "neighborhood",
    "city",
    "state",
];

function normalizeText(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

export function normalizeAddress(address) {
    return Object.freeze({
        zipCode: normalizeZipCode(address.zipCode),
        street: normalizeText(address.street),
        number: normalizeText(address.number),
        neighborhood: normalizeText(address.neighborhood),
        city: normalizeText(address.city),
        state: normalizeText(address.state),
    });
}

export function buildGeocodingCacheKey(address) {
    const normalized = normalizeAddress(address);
    const fingerprint = ADDRESS_KEY_FIELDS.map((field) => normalized[field]);
    const hash = createHash("sha256")
        .update(JSON.stringify(fingerprint))
        .digest("hex");
    return `${GEOCODING_CACHE_KEY_PREFIX}:${hash}`;
}

function formatCoordinate(value, limit) {
    const text = String(value).trim();
    if (!COORDINATE_PATTERN.test(text)) {
        return null;
    }
    const coordinate = new Decimal(text);
    if (coordinate.abs().greaterThan(limit)) {
        return null;
    }
    return coordinate.toFixed(GEOCODING_COORDINATE_DECIMALS);
}

function toCoordinates(result) {
    const latitude = formatCoordinate(result.latitude, LATITUDE_LIMIT);
    const longitude = formatCoordinate(result.longitude, LONGITUDE_LIMIT);
    if (latitude === null || longitude === null) {
        return null;
    }
    return Object.freeze({ latitude, longitude });
}

function parseCachedValue(value) {
    if (value === NOT_FOUND_CACHE_VALUE) {
        return null;
    }
    const parsed = JSON.parse(value);
    return toCoordinates(parsed);
}

function createNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.GEOCODING_NOT_FOUND,
        GEOCODING_NOT_FOUND_MESSAGE,
    );
}

function waitFor(milliseconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
}

export function createGeocodingService({
    gateway = nominatimGateway,
    getRedis = defaultGetRedis,
    rateLimiter = createRateLimiter(GEOCODING_RATE_LIMIT),
    logger = defaultLogger,
    sleep = waitFor,
} = {}) {
    async function readCache(cacheKey) {
        try {
            const redis = await getRedis();
            const value = await redis.get(cacheKey);
            if (value === null) {
                return { isHit: false };
            }
            return { isHit: true, coordinates: parseCachedValue(value) };
        } catch (error) {
            logger.warn("Geocoding cache read failed", {
                error: serializeError(error),
            });
            return { isHit: false };
        }
    }

    async function writeCache(cacheKey, coordinates) {
        const value = coordinates
            ? JSON.stringify(coordinates)
            : NOT_FOUND_CACHE_VALUE;
        const ttlSeconds = coordinates
            ? GEOCODING_FOUND_CACHE_TTL_SECONDS
            : GEOCODING_NOT_FOUND_CACHE_TTL_SECONDS;
        try {
            const redis = await getRedis();
            await redis.set(cacheKey, value, {
                expiration: { type: "EX", value: ttlSeconds },
            });
        } catch (error) {
            logger.warn("Geocoding cache write failed", {
                error: serializeError(error),
            });
        }
    }

    async function tryAcquireSlot() {
        const redis = await getRedis();
        const result = await redis.set(NOMINATIM_THROTTLE_KEY, "1", {
            expiration: { type: "PX", value: NOMINATIM_MIN_INTERVAL_MS },
            condition: "NX",
        });
        return result === "OK";
    }

    async function acquireNominatimSlot() {
        for (
            let attempt = 1;
            attempt <= NOMINATIM_MAX_THROTTLE_ATTEMPTS;
            attempt += 1
        ) {
            if (await tryAcquireSlot()) {
                return;
            }
            if (attempt < NOMINATIM_MAX_THROTTLE_ATTEMPTS) {
                await sleep(NOMINATIM_MIN_INTERVAL_MS);
            }
        }
        throw new Error("Nominatim throttle slot not available");
    }

    async function searchNominatim(address) {
        try {
            await acquireNominatimSlot();
            const result = await gateway.search(address);
            return result ? toCoordinates(result) : null;
        } catch (error) {
            logger.error("Geocoding unavailable", {
                error: serializeError(error),
            });
            throw new ServiceUnavailableError(GEOCODING_UNAVAILABLE_MESSAGE);
        }
    }

    async function geocodeAddress(address) {
        const cacheKey = buildGeocodingCacheKey(address);
        const cached = await readCache(cacheKey);
        const coordinates = cached.isHit
            ? cached.coordinates
            : await searchNominatim(address);
        if (!cached.isHit) {
            await writeCache(cacheKey, coordinates);
        }
        if (!coordinates) {
            throw createNotFoundError();
        }
        return coordinates;
    }

    async function resolveAddress(user, address) {
        const { isLimited, retryAfterSeconds } = await rateLimiter.check(
            user.id,
        );
        if (isLimited) {
            throw new RateLimitError(
                GEOCODING_RATE_LIMITED_MESSAGE,
                retryAfterSeconds,
            );
        }
        await rateLimiter.recordFailure(user.id);
        return geocodeAddress(address);
    }

    return Object.freeze({ geocodeAddress, resolveAddress });
}

export const geocodingService = createGeocodingService();
