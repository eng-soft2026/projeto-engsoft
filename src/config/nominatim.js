export const DEFAULT_NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

function readTrimmed(value) {
    return typeof value === "string" ? value.trim() : "";
}

export function getNominatimConfig(env = process.env) {
    const baseUrl = readTrimmed(env.NOMINATIM_BASE_URL).replace(/\/+$/, "");
    return Object.freeze({
        baseUrl: baseUrl || DEFAULT_NOMINATIM_BASE_URL,
        userAgent: readTrimmed(env.NOMINATIM_USER_AGENT),
    });
}

export function isNominatimConfigured(config) {
    return Boolean(config.baseUrl && config.userAgent);
}
