import { logger as defaultLogger, serializeError } from "./logger.js";
import { getRedis as defaultGetRedis } from "./redis.js";

export const DEFAULT_RATE_LIMITER_TIMEOUT_MS = 500;
export const RATE_LIMITER_FAILURE_LOG_MESSAGE = "Rate limiter unavailable";

const NOT_LIMITED = Object.freeze({ isLimited: false, retryAfterSeconds: 0 });

export class RateLimiterTimeoutError extends Error {
    constructor(timeoutMs) {
        super(`Rate limiter timed out after ${timeoutMs} ms`);
        this.name = "RateLimiterTimeoutError";
    }
}

function runWithTimeout(operation, timeoutMs) {
    let timer;
    const timeout = new Promise((resolve, reject) => {
        timer = setTimeout(() => {
            reject(new RateLimiterTimeoutError(timeoutMs));
        }, timeoutMs);
    });
    const execution = Promise.resolve().then(operation);
    return Promise.race([execution, timeout]).finally(() => {
        clearTimeout(timer);
    });
}

function parseAttempts(value) {
    return value ? Number.parseInt(value, 10) : 0;
}

export function createRateLimiter({
    keyPrefix,
    maxAttempts,
    windowSeconds,
    getRedis = defaultGetRedis,
    timeoutMs = DEFAULT_RATE_LIMITER_TIMEOUT_MS,
    logger = defaultLogger,
}) {
    function buildKey(identifier) {
        return `${keyPrefix}:${identifier}`;
    }

    async function runFailOpen(operation, fallback) {
        try {
            return await runWithTimeout(async () => {
                return operation(await getRedis());
            }, timeoutMs);
        } catch (error) {
            logger.warn(RATE_LIMITER_FAILURE_LOG_MESSAGE, {
                keyPrefix,
                error: serializeError(error),
            });
            return fallback;
        }
    }

    async function readRetryAfterSeconds(redis, key) {
        const secondsToLive = await redis.ttl(key);
        return secondsToLive > 0 ? secondsToLive : windowSeconds;
    }

    function check(identifier) {
        const key = buildKey(identifier);
        return runFailOpen(async (redis) => {
            const attempts = parseAttempts(await redis.get(key));
            if (attempts < maxAttempts) {
                return NOT_LIMITED;
            }
            return {
                isLimited: true,
                retryAfterSeconds: await readRetryAfterSeconds(redis, key),
            };
        }, NOT_LIMITED);
    }

    function recordFailure(identifier) {
        const key = buildKey(identifier);
        return runFailOpen(async (redis) => {
            await redis.incr(key);
            await redis.expire(key, windowSeconds, "NX");
        }, undefined);
    }

    function reset(identifier) {
        const key = buildKey(identifier);
        return runFailOpen(async (redis) => {
            await redis.del(key);
        }, undefined);
    }

    return Object.freeze({ check, recordFailure, reset });
}
