import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getLiveness } from "../../../src/app/api/health/route.js";
import { GET as getReadiness } from "../../../src/app/api/health/ready/route.js";
import { logger } from "../../../src/lib/logger.js";

const { getPrisma, getRedis, queryRaw, ping } = vi.hoisted(() => {
    const queryRaw = vi.fn();
    const ping = vi.fn();
    return {
        queryRaw,
        ping,
        getPrisma: vi.fn(() => ({ $queryRaw: queryRaw })),
        getRedis: vi.fn(async () => ({ ping })),
    };
});

vi.mock("../../../src/lib/prisma.js", () => ({ getPrisma }));
vi.mock("../../../src/lib/redis.js", () => ({ getRedis }));

const MYSQL_URL = "mysql://root:super-secret@db.internal:3306/hotel_booking";
const REDIS_URL = "redis://:redis-secret@cache.internal:6379/0";

function createRequest(path) {
    return new Request(`http://localhost${path}`);
}

describe("/api/health", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(logger, "info").mockImplementation(() => {});
    });

    it("answers 200 without touching MySQL or Redis", async () => {
        const response = await getLiveness(createRequest("/api/health"));

        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(response.headers.get("x-request-id")).toBeTruthy();
        expect(await response.json()).toEqual({
            success: true,
            data: { status: "ok" },
        });
        expect(getPrisma).not.toHaveBeenCalled();
        expect(getRedis).not.toHaveBeenCalled();
    });
});

describe("/api/health/ready", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(logger, "info").mockImplementation(() => {});
        vi.spyOn(logger, "warn").mockImplementation(() => {});
        queryRaw.mockResolvedValue([{ 1: 1n }]);
        ping.mockResolvedValue("PONG");
    });

    it("answers 200 when MySQL and Redis are up", async () => {
        const response = await getReadiness(createRequest("/api/health/ready"));

        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(await response.json()).toEqual({
            success: true,
            data: {
                status: "ready",
                components: { mysql: "up", redis: "up" },
            },
        });
        expect(queryRaw).toHaveBeenCalledTimes(1);
        expect(ping).toHaveBeenCalledTimes(1);
    });

    it("answers 503 with MySQL down", async () => {
        queryRaw.mockRejectedValue(
            new Error(`connect ECONNREFUSED ${MYSQL_URL}`),
        );

        const response = await getReadiness(createRequest("/api/health/ready"));

        expect(response.status).toBe(503);
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(await response.json()).toEqual({
            success: false,
            error: {
                code: "SERVICE_UNAVAILABLE",
                message: "Serviço indisponível no momento.",
            },
            data: {
                status: "not_ready",
                components: { mysql: "down", redis: "up" },
            },
        });
    });

    it("answers 503 with Redis down", async () => {
        getRedis.mockRejectedValueOnce(
            new Error(`connect ECONNREFUSED ${REDIS_URL}`),
        );

        const response = await getReadiness(createRequest("/api/health/ready"));
        const body = await response.json();

        expect(response.status).toBe(503);
        expect(body.data.components).toEqual({ mysql: "up", redis: "down" });
    });

    it("answers 503 when Redis does not answer the ping", async () => {
        ping.mockRejectedValue(new Error("Socket closed unexpectedly"));

        const response = await getReadiness(createRequest("/api/health/ready"));
        const body = await response.json();

        expect(response.status).toBe(503);
        expect(body.data.components.redis).toBe("down");
    });

    it("never exposes connection details in the response", async () => {
        queryRaw.mockRejectedValue(new Error(`Access denied ${MYSQL_URL}`));
        getRedis.mockRejectedValueOnce(new Error(`Auth failed ${REDIS_URL}`));

        const response = await getReadiness(createRequest("/api/health/ready"));
        const text = await response.text();

        expect(response.status).toBe(503);
        for (const fragment of [
            "mysql://",
            "redis://",
            "super-secret",
            "redis-secret",
            "db.internal",
            "cache.internal",
            "ECONNREFUSED",
            "Access denied",
        ]) {
            expect(text).not.toContain(fragment);
        }
    });

    it("logs which component failed", async () => {
        queryRaw.mockRejectedValue(new Error("Connection refused"));

        await getReadiness(createRequest("/api/health/ready"));

        expect(logger.warn).toHaveBeenCalledWith(
            "Readiness probe failed",
            expect.objectContaining({ component: "mysql" }),
        );
    });
});
