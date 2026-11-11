import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    GEOCODING_FOUND_CACHE_TTL_SECONDS,
    GEOCODING_NOT_FOUND_CACHE_TTL_SECONDS,
    NOMINATIM_MAX_THROTTLE_ATTEMPTS,
    NOMINATIM_MIN_INTERVAL_MS,
    NOMINATIM_THROTTLE_KEY,
} from "../../../src/constants/geocoding.js";
import {
    NotFoundError,
    RateLimitError,
    ServiceUnavailableError,
} from "../../../src/lib/errors.js";
import {
    buildGeocodingCacheKey,
    createGeocodingService,
} from "../../../src/modules/maps/geocoding-service.js";
import { createFakeClock } from "../../helpers/factories/index.js";
import { createFakeRedis } from "../../helpers/fake-redis.js";

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const ADDRESS = Object.freeze({
    zipCode: "01001000",
    street: "Praça da Sé",
    number: "100",
    complement: null,
    neighborhood: "Sé",
    city: "São Paulo",
    state: "SP",
});
const COORDINATES = Object.freeze({
    latitude: "-23.550520",
    longitude: "-46.633309",
});

function createFakeLogger() {
    return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function createRateLimiter({ isLimited = false } = {}) {
    return {
        check: vi.fn().mockResolvedValue({
            isLimited,
            retryAfterSeconds: isLimited ? 120 : 0,
        }),
        recordFailure: vi.fn().mockResolvedValue(undefined),
    };
}

describe("buildGeocodingCacheKey", () => {
    it("ignores case, accents, spacing, zip format and complement", () => {
        const variant = {
            ...ADDRESS,
            zipCode: "01001-000",
            street: "  PRACA   da se ",
            complement: "Sala 2",
            city: "sao paulo",
            state: "sp",
        };

        expect(buildGeocodingCacheKey(variant)).toBe(
            buildGeocodingCacheKey(ADDRESS),
        );
    });

    it("changes when the number changes", () => {
        expect(buildGeocodingCacheKey({ ...ADDRESS, number: "101" })).not.toBe(
            buildGeocodingCacheKey(ADDRESS),
        );
    });
});

describe("createGeocodingService", () => {
    let clock;
    let redis;
    let gateway;
    let logger;
    let rateLimiter;
    let sleep;
    let service;

    function buildService(overrides = {}) {
        return createGeocodingService({
            gateway,
            getRedis: async () => redis,
            rateLimiter,
            logger,
            sleep,
            ...overrides,
        });
    }

    beforeEach(() => {
        clock = createFakeClock();
        redis = createFakeRedis({ now: clock.now });
        gateway = {
            search: vi.fn().mockResolvedValue({
                latitude: "-23.5505199",
                longitude: "-46.6333094",
            }),
        };
        logger = createFakeLogger();
        rateLimiter = createRateLimiter();
        sleep = vi.fn(async (milliseconds) => {
            clock.advance({ milliseconds });
        });
        service = buildService();
    });

    it("geocodes on a cache miss and caches the six-decimal result", async () => {
        const result = await service.geocodeAddress(ADDRESS);

        expect(result).toEqual(COORDINATES);
        expect(gateway.search).toHaveBeenCalledWith(ADDRESS);
        const cacheKey = buildGeocodingCacheKey(ADDRESS);
        expect(JSON.parse(await redis.get(cacheKey))).toEqual(COORDINATES);
        expect(await redis.ttl(cacheKey)).toBe(
            GEOCODING_FOUND_CACHE_TTL_SECONDS,
        );
    });

    it("answers from the cache without calling Nominatim", async () => {
        await service.geocodeAddress(ADDRESS);
        clock.advance({ seconds: 5 });

        const result = await service.geocodeAddress({
            ...ADDRESS,
            city: "SAO PAULO",
        });

        expect(result).toEqual(COORDINATES);
        expect(gateway.search).toHaveBeenCalledTimes(1);
    });

    it("throws GEOCODING_NOT_FOUND and caches the miss for a day", async () => {
        gateway.search.mockResolvedValue(null);

        await expect(service.geocodeAddress(ADDRESS)).rejects.toMatchObject({
            code: "GEOCODING_NOT_FOUND",
        });
        clock.advance({ seconds: 5 });
        await expect(service.geocodeAddress(ADDRESS)).rejects.toBeInstanceOf(
            NotFoundError,
        );

        expect(gateway.search).toHaveBeenCalledTimes(1);
        expect(await redis.ttl(buildGeocodingCacheKey(ADDRESS))).toBe(
            GEOCODING_NOT_FOUND_CACHE_TTL_SECONDS - 5,
        );
    });

    it("treats out-of-range coordinates as not found", async () => {
        gateway.search.mockResolvedValue({ latitude: "95", longitude: "10" });

        await expect(service.geocodeAddress(ADDRESS)).rejects.toBeInstanceOf(
            NotFoundError,
        );
    });

    it("answers 503 and logs when the gateway is unavailable", async () => {
        gateway.search.mockRejectedValue(new Error("connect ECONNREFUSED"));

        await expect(service.geocodeAddress(ADDRESS)).rejects.toBeInstanceOf(
            ServiceUnavailableError,
        );
        expect(logger.error).toHaveBeenCalledWith(
            "Geocoding unavailable",
            expect.any(Object),
        );
        expect(await redis.get(buildGeocodingCacheKey(ADDRESS))).toBeNull();
    });

    it("waits for the one-second Nominatim slot", async () => {
        await service.geocodeAddress(ADDRESS);

        await service.geocodeAddress({ ...ADDRESS, number: "200" });

        expect(sleep).toHaveBeenCalledTimes(1);
        expect(sleep).toHaveBeenCalledWith(NOMINATIM_MIN_INTERVAL_MS);
        expect(gateway.search).toHaveBeenCalledTimes(2);
    });

    it("answers 503 when the slot stays busy", async () => {
        sleep.mockResolvedValue(undefined);
        await redis.set(NOMINATIM_THROTTLE_KEY, "1", {
            expiration: { type: "PX", value: 60_000 },
        });

        await expect(service.geocodeAddress(ADDRESS)).rejects.toBeInstanceOf(
            ServiceUnavailableError,
        );
        expect(sleep).toHaveBeenCalledTimes(
            NOMINATIM_MAX_THROTTLE_ATTEMPTS - 1,
        );
        expect(gateway.search).not.toHaveBeenCalled();
    });

    it("still geocodes when the cache read fails", async () => {
        const failingRedis = {
            ...redis,
            get: vi.fn().mockRejectedValue(new Error("redis down")),
        };
        service = buildService({ getRedis: async () => failingRedis });

        await expect(service.geocodeAddress(ADDRESS)).resolves.toEqual(
            COORDINATES,
        );
        expect(logger.warn).toHaveBeenCalled();
    });

    it("resolveAddress counts the request against the user limit", async () => {
        const result = await service.resolveAddress(MANAGER, ADDRESS);

        expect(result).toEqual(COORDINATES);
        expect(rateLimiter.check).toHaveBeenCalledWith(MANAGER.id);
        expect(rateLimiter.recordFailure).toHaveBeenCalledWith(MANAGER.id);
    });

    it("resolveAddress refuses a rate limited user", async () => {
        rateLimiter = createRateLimiter({ isLimited: true });
        service = buildService();

        const error = await service
            .resolveAddress(MANAGER, ADDRESS)
            .catch((caught) => caught);

        expect(error).toBeInstanceOf(RateLimitError);
        expect(error.retryAfterSeconds).toBe(120);
        expect(gateway.search).not.toHaveBeenCalled();
    });
});
