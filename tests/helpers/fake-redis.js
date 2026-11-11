const MS_PER_SECOND = 1000;
const NO_EXPIRATION = -1;
const MISSING_KEY = -2;

function toDurationMs(expiration) {
    if (expiration?.type === "PX") {
        return expiration.value;
    }
    if (expiration?.type === "EX") {
        return expiration.value * MS_PER_SECOND;
    }
    return null;
}

export function createFakeRedis({ now = () => new Date() } = {}) {
    const entries = new Map();

    function readEntry(key) {
        const entry = entries.get(key);
        if (!entry) {
            return null;
        }
        if (entry.expiresAt !== null && entry.expiresAt <= now().getTime()) {
            entries.delete(key);
            return null;
        }
        return entry;
    }

    return {
        async get(key) {
            return readEntry(key)?.value ?? null;
        },
        async set(key, value, { expiration, condition } = {}) {
            if (condition === "NX" && readEntry(key)) {
                return null;
            }
            const durationMs = toDurationMs(expiration);
            entries.set(key, {
                value: String(value),
                expiresAt:
                    durationMs === null ? null : now().getTime() + durationMs,
            });
            return "OK";
        },
        async incr(key) {
            const entry = readEntry(key) ?? { value: "0", expiresAt: null };
            const value = String(Number.parseInt(entry.value, 10) + 1);
            entries.set(key, { ...entry, value });
            return Number.parseInt(value, 10);
        },
        async expire(key, seconds, mode) {
            const entry = readEntry(key);
            if (!entry || (mode === "NX" && entry.expiresAt !== null)) {
                return 0;
            }
            entry.expiresAt = now().getTime() + seconds * MS_PER_SECOND;
            return 1;
        },
        async ttl(key) {
            const entry = readEntry(key);
            if (!entry) {
                return MISSING_KEY;
            }
            if (entry.expiresAt === null) {
                return NO_EXPIRATION;
            }
            return Math.ceil(
                (entry.expiresAt - now().getTime()) / MS_PER_SECOND,
            );
        },
        async del(key) {
            return entries.delete(key) ? 1 : 0;
        },
        keys() {
            return [...entries.keys()];
        },
    };
}
