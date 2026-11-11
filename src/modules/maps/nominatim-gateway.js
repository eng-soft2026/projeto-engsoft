import {
    getNominatimConfig,
    isNominatimConfigured,
} from "../../config/nominatim.js";
import { NOMINATIM_TIMEOUT_MS } from "../../constants/geocoding.js";
import { formatZipCode } from "../../utils/zip-code.js";

export const NOMINATIM_SEARCH_PATH = "/search";

export class NominatimGatewayError extends Error {
    constructor(message) {
        super(message);
        this.name = "NominatimGatewayError";
    }
}

export function buildNominatimSearchParams(address) {
    return new URLSearchParams({
        street: `${address.number} ${address.street}`,
        city: address.city,
        state: address.state,
        postalcode: formatZipCode(address.zipCode),
        countrycodes: "br",
        format: "jsonv2",
        limit: "1",
        addressdetails: "0",
    });
}

function readFirstResult(body) {
    if (!Array.isArray(body)) {
        throw new NominatimGatewayError("Unexpected Nominatim response");
    }
    if (body.length === 0) {
        return null;
    }
    const [{ lat, lon }] = body;
    if (typeof lat !== "string" || typeof lon !== "string") {
        throw new NominatimGatewayError("Nominatim result without coordinates");
    }
    return Object.freeze({ latitude: lat, longitude: lon });
}

export function createNominatimGateway({
    getConfig = getNominatimConfig,
    fetchImpl = (...args) => globalThis.fetch(...args),
    timeoutMs = NOMINATIM_TIMEOUT_MS,
} = {}) {
    function requireConfig() {
        const config = getConfig();
        if (!isNominatimConfigured(config)) {
            throw new NominatimGatewayError("Nominatim is not configured");
        }
        return config;
    }

    async function search(address) {
        const config = requireConfig();
        const params = buildNominatimSearchParams(address);
        const url = `${config.baseUrl}${NOMINATIM_SEARCH_PATH}?${params}`;
        const response = await fetchImpl(url, {
            method: "GET",
            headers: {
                "User-Agent": config.userAgent,
                Accept: "application/json",
                "Accept-Language": "pt-BR",
            },
            signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok) {
            throw new NominatimGatewayError(
                `Nominatim responded with status ${response.status}`,
            );
        }
        return readFirstResult(await response.json());
    }

    return Object.freeze({ search });
}

export const nominatimGateway = createNominatimGateway();
