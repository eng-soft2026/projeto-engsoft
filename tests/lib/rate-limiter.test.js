import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    DEFAULT_RATE_LIMITER_TIMEOUT_MS,
    RATE_LIMITER_FAILURE_LOG_MESSAGE,
    createRateLimiter,
} from "../../src/lib/rate-limiter.js";
import { createFakeClock } from "../helpers/factories/index.js";
import { createFakeRedis } from "../helpers/fake-redis.js";

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 5;
const IDENTIFIER = "203.0.113.7:hash";

function createFakeLogger() {
    return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function buildLimiter(overrides = {}) {
    return createRateLimiter({
        keyPrefix: "login-attempts",
        maxAttempts: MAX_ATTEMPTS,
        windowSeconds: WINDOW_SECONDS,
        ...overrides,
    });
}

async function recordFailures(limiter, count) {
    for (let attempt = 0; attempt < count; attempt += 1) {
        await limiter.recordFailure(IDENTIFIER);
    }
}

describe("createRateLimiter", () => {
    let clock;
    let redis;
    let logger;
    let limiter;

    beforeEach(() => {
        clock = createFakeClock();
        redis = createFakeRedis({ now: clock.now });
        logger = createFakeLogger();
        limiter = buildLimiter({ getRedis: async () => redis, logger });
    });

    it("allows attempts below the limit", async () => {
        await recordFailures(limiter, MAX_ATTEMPTS - 1);

        await expect(limiter.check(IDENTIFIER)).resolves.toEqual({
            isLimited: false,
            retryAfterSeconds: 0,
        });
    });

    it("limits the identifier once the failures reach the limit", async () => {
        await recordFailures(limiter, MAX_ATTEMPTS);

        await expect(limiter.check(IDENTIFIER)).resolves.toEqual({
            isLimited: true,
            retryAfterSeconds: WINDOW_SECONDS,
        });
    });

    it("stores the counter under the key prefix with the window as TTL", async () => {
        await recordFailures(limiter, 1);

        expect(redis.keys()).toEqual([`login-attempts:${IDENTIFIER}`]);
        await expect(redis.ttl(`login-attempts:${IDENTIFIER}`)).resolves.toBe(
            WINDOW_SECONDS,
        );
    });

    it("keeps a fixed window that later failures do not extend", async () => {
        await recordFailures(limiter, 1);
        clock.advance({ minutes: 10 });
        await recordFailures(limiter, MAX_ATTEMPTS - 1);

        await expect(limiter.check(IDENTIFIER)).resolves.toEqual({
            isLimited: true,
            retryAfterSeconds: 5 * 60,
        });
    });

    it("allows attempts again when the window expires", async () => {
        await recordFailures(limiter, MAX_ATTEMPTS);
        clock.advance({ seconds: WINDOW_SECONDS });

        await expect(limiter.check(IDENTIFIER)).resolves.toMatchObject({
            isLimited: false,
        });
    });

    it("answers the whole window when the counter has no TTL", async () => {
        await redis.incr(`login-attempts:${IDENTIFIER}`);
        await redis.incr(`login-attempts:${IDENTIFIER}`);
        const strictLimiter = buildLimiter({
            getRedis: async () => redis,
            maxAttempts: 2,
            logger,
        });

        await expect(strictLimiter.check(IDENTIFIER)).resolves.toEqual({
            isLimited: true,
            retryAfterSeconds: WINDOW_SECONDS,
        });
    });

    it("clears the counter on reset", async () => {
        await recordFailures(limiter, MAX_ATTEMPTS);
        await limiter.reset(IDENTIFIER);

        await expect(limiter.check(IDENTIFIER)).resolves.toMatchObject({
            isLimited: false,
        });
        expect(redis.keys()).toEqual([]);
    });

    it("keeps separate counters per identifier", async () => {
        await recordFailures(limiter, MAX_ATTEMPTS);

        await expect(limiter.check("198.51.100.1:hash")).resolves.toMatchObject(
            { isLimited: false },
        );
    });

    it("uses a short default timeout", () => {
        expect(DEFAULT_RATE_LIMITER_TIMEOUT_MS).toBe(500);
    });
});

describe("createRateLimiter when Redis fails", () => {
    it.each([
        [
            "the connection throws",
            async () => {
                throw new Error("connect ECONNREFUSED");
            },
        ],
        [
            "a command throws",
            async () => ({
                get: async () => {
                    throw new Error("READONLY");
                },
                incr: async () => {
                    throw new Error("READONLY");
                },
                del: async () => {
                    throw new Error("READONLY");
                },
            }),
        ],
        ["the connection hangs", () => new Promise(() => {})],
    ])("fails open and logs a warning when %s", async (_, getRedis) => {
        const logger = createFakeLogger();
        const limiter = buildLimiter({ getRedis, logger, timeoutMs: 10 });

        await expect(limiter.check(IDENTIFIER)).resolves.toEqual({
            isLimited: false,
            retryAfterSeconds: 0,
        });
        await expect(limiter.recordFailure(IDENTIFIER)).resolves.toBe(
            undefined,
        );
        await expect(limiter.reset(IDENTIFIER)).resolves.toBe(undefined);
        expect(logger.warn).toHaveBeenCalledTimes(3);
        expect(logger.warn).toHaveBeenCalledWith(
            RATE_LIMITER_FAILURE_LOG_MESSAGE,
            expect.objectContaining({ keyPrefix: "login-attempts" }),
        );
    });

    it("never logs the identifier", async () => {
        const logger = createFakeLogger();
        const limiter = buildLimiter({
            getRedis: async () => {
                throw new Error("down");
            },
            logger,
        });

        await limiter.check(IDENTIFIER);

        expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(
            IDENTIFIER,
        );
    });
});
