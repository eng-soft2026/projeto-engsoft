import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.fn();

vi.mock("redis", () => ({
    createClient: (options) => createClient(options),
}));

function buildFakeClient() {
    const client = {
        isOpen: false,
        on: vi.fn(),
        connect: vi.fn(async () => {
            client.isOpen = true;
        }),
    };
    return client;
}

describe("getRedis", () => {
    let fakeClient;

    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        delete globalThis.redisClient;
        fakeClient = buildFakeClient();
        createClient.mockReturnValue(fakeClient);
        vi.stubEnv("REDIS_URL", "redis://localhost:6379");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("does not create a client on import", async () => {
        await import("../../src/lib/redis.js");

        expect(createClient).not.toHaveBeenCalled();
    });

    it("creates and connects the client using REDIS_URL", async () => {
        const { getRedis } = await import("../../src/lib/redis.js");

        const client = await getRedis();

        expect(createClient).toHaveBeenCalledWith({
            url: "redis://localhost:6379",
        });
        expect(fakeClient.connect).toHaveBeenCalledTimes(1);
        expect(client).toBe(fakeClient);
    });

    it("reuses the same connected instance on repeated calls", async () => {
        const { getRedis } = await import("../../src/lib/redis.js");

        const first = await getRedis();
        const second = await getRedis();

        expect(first).toBe(second);
        expect(createClient).toHaveBeenCalledTimes(1);
        expect(fakeClient.connect).toHaveBeenCalledTimes(1);
    });

    it("registers an error handler", async () => {
        const { getRedis } = await import("../../src/lib/redis.js");

        await getRedis();

        expect(fakeClient.on).toHaveBeenCalledWith(
            "error",
            expect.any(Function),
        );
    });

    it("rejects when REDIS_URL is missing", async () => {
        vi.stubEnv("REDIS_URL", "");
        const { getRedis } = await import("../../src/lib/redis.js");

        await expect(getRedis()).rejects.toThrow("REDIS_URL is not defined");
    });
});
