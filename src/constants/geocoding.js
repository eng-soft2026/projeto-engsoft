const SECONDS_PER_DAY = 24 * 60 * 60;

export const GEOCODING_RATE_LIMIT = Object.freeze({
    keyPrefix: "geocoding-requests",
    maxAttempts: 10,
    windowSeconds: 10 * 60,
});

export const GEOCODING_CACHE_KEY_PREFIX = "geocoding:address";
export const GEOCODING_FOUND_CACHE_TTL_SECONDS = 30 * SECONDS_PER_DAY;
export const GEOCODING_NOT_FOUND_CACHE_TTL_SECONDS = SECONDS_PER_DAY;

export const NOMINATIM_THROTTLE_KEY = "geocoding:nominatim:throttle";
export const NOMINATIM_MIN_INTERVAL_MS = 1000;
export const NOMINATIM_MAX_THROTTLE_ATTEMPTS = 3;
export const NOMINATIM_TIMEOUT_MS = 5000;

export const GEOCODING_COORDINATE_DECIMALS = 6;
