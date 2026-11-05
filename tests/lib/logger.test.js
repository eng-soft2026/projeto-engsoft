import { afterEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "../../src/lib/errors.js";
import {
    createLogger,
    formatReadableLine,
    maskCpf,
    redactLogData,
    resolveLogLevel,
    serializeError,
} from "../../src/lib/logger.js";
import { runWithRequestStore } from "../../src/lib/request-store.js";

function createMemoryDestination() {
    const lines = [];
    return {
        lines,
        write(line) {
            lines.push(line);
        },
    };
}

function createProductionLogger(level = "info") {
    const destination = createMemoryDestination();
    const logger = createLogger({ level, isProduction: true, destination });
    const readEntries = () => destination.lines.map((line) => JSON.parse(line));
    return { logger, readEntries, destination };
}

describe("redactLogData", () => {
    it("redacts sensitive keys at any depth and in arrays", () => {
        const redacted = redactLogData({
            user: {
                email: "ana@example.com",
                password: "senhaSegura1",
                passwordHash: "$2b$12$hash",
                profile: { accessToken: "abc", nested: [{ secret: "s3" }] },
            },
            headers: { Authorization: "Bearer x", cookie: "session=1" },
            stripeSecretKey: "sk_live",
            StripeWebhookSecret: "whsec",
            token: "t",
        });

        expect(redacted).toEqual({
            user: {
                email: "ana@example.com",
                password: "[REDACTED]",
                passwordHash: "[REDACTED]",
                profile: {
                    accessToken: "[REDACTED]",
                    nested: [{ secret: "[REDACTED]" }],
                },
            },
            headers: { Authorization: "[REDACTED]", cookie: "[REDACTED]" },
            stripeSecretKey: "[REDACTED]",
            StripeWebhookSecret: "[REDACTED]",
            token: "[REDACTED]",
        });
    });

    it("masks the cpf keeping only the last two digits", () => {
        expect(
            redactLogData({ guest: { cpf: "529.982.247-25", ownerCpf: 1 } }),
        ).toEqual({ guest: { cpf: "*********25", ownerCpf: "[REDACTED]" } });
    });

    it("keeps a null cpf as is", () => {
        expect(redactLogData({ cpf: null })).toEqual({ cpf: null });
    });

    it("does not change the original object", () => {
        const original = { user: { password: "senhaSegura1" } };

        redactLogData(original);

        expect(original.user.password).toBe("senhaSegura1");
    });

    it("serializes nested errors and stops at circular references", () => {
        const context = { error: new Error("boom") };
        context.self = context;

        const redacted = redactLogData(context, { isProduction: true });

        expect(redacted).toEqual({
            error: { name: "Error" },
            self: "[Circular]",
        });
    });

    it("keeps non plain objects such as dates", () => {
        const createdAt = new Date("2026-10-15T12:00:00.000Z");

        expect(redactLogData({ createdAt })).toEqual({ createdAt });
    });
});

describe("maskCpf", () => {
    it("fully redacts values too short to mask", () => {
        expect(maskCpf("1")).toBe("[REDACTED]");
    });
});

describe("serializeError", () => {
    it("returns only the name and code in production, without message or stack", () => {
        const error = Object.assign(new Error("passwordHash=abc"), {
            code: "P2002",
        });

        expect(serializeError(error, { isProduction: true })).toEqual({
            name: "Error",
            code: "P2002",
        });
    });

    it("keeps the message of a DomainError in production", () => {
        const error = new NotFoundError(
            "HOTEL_NOT_FOUND",
            "Hotel não encontrado.",
        );

        expect(serializeError(error, { isProduction: true })).toEqual({
            name: error.name,
            code: "HOTEL_NOT_FOUND",
            message: "Hotel não encontrado.",
        });
    });

    it("includes the message and the stack in development", () => {
        const error = new Error("boom");

        const serialized = serializeError(error, { isProduction: false });

        expect(serialized.message).toBe("boom");
        expect(serialized.stack).toBe(error.stack);
    });

    it("handles values that are not errors", () => {
        expect(serializeError("boom", { isProduction: true })).toEqual({
            name: "UnknownError",
        });
    });
});

describe("resolveLogLevel", () => {
    it.each([
        ["debug", "debug"],
        [" WARN ", "warn"],
        ["silent", "silent"],
        ["verbose", "info"],
        [undefined, "info"],
    ])("resolves %j to %s", (input, expected) => {
        expect(resolveLogLevel(input)).toBe(expected);
    });
});

describe("createLogger", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("writes one JSON line per entry in production, with level, time and message", () => {
        const { logger, readEntries } = createProductionLogger();

        logger.info("hotel created", { hotelId: "h-1" });

        const [entry] = readEntries();
        expect(entry).toMatchObject({
            level: "info",
            msg: "hotel created",
            hotelId: "h-1",
        });
        expect(new Date(entry.time).toISOString()).toBe(entry.time);
    });

    it("redacts the context before writing", () => {
        const { logger, destination } = createProductionLogger();

        logger.error("login failed", {
            body: { email: "ana@example.com", password: "senhaSegura1" },
            cpf: "52998224725",
        });

        const output = destination.lines.join("");
        expect(output).not.toContain("senhaSegura1");
        expect(output).not.toContain("52998224725");
        expect(output).toContain("*********25");
    });

    it("filters entries below the configured level", () => {
        const { logger, readEntries } = createProductionLogger("warn");

        logger.debug("debug entry");
        logger.info("info entry");
        logger.warn("warn entry");
        logger.error("error entry");

        expect(readEntries().map((entry) => entry.msg)).toEqual([
            "warn entry",
            "error entry",
        ]);
    });

    it("reads the level from LOG_LEVEL by default", () => {
        vi.stubEnv("LOG_LEVEL", "error");
        const destination = createMemoryDestination();
        const logger = createLogger({ isProduction: true, destination });

        logger.warn("warn entry");
        logger.error("error entry");

        expect(destination.lines).toHaveLength(1);
    });

    it("adds the request id, the user id and the route of the current request", () => {
        const { logger, readEntries } = createProductionLogger();

        runWithRequestStore(
            { requestId: "req-1", userId: "user-1", route: "/api/hotels/[id]" },
            () => logger.info("hotel loaded", { hotelCount: 1 }),
        );
        logger.info("outside a request");

        const [insideEntry, outsideEntry] = readEntries();
        expect(insideEntry).toMatchObject({
            msg: "hotel loaded",
            requestId: "req-1",
            userId: "user-1",
            route: "/api/hotels/[id]",
            hotelCount: 1,
        });
        expect(outsideEntry).not.toHaveProperty("requestId");
        expect(outsideEntry).not.toHaveProperty("route");
    });

    it("lets the explicit context override the request store fields", () => {
        const destination = createMemoryDestination();
        const logger = createLogger({
            isProduction: true,
            destination,
            readContext: () => ({ requestId: "from-store", route: "/api" }),
        });

        logger.info("entry", { requestId: "explicit" });

        expect(JSON.parse(destination.lines[0])).toMatchObject({
            requestId: "explicit",
            route: "/api",
        });
    });

    it("writes readable lines outside production", () => {
        const destination = createMemoryDestination();
        const logger = createLogger({ isProduction: false, destination });

        logger.warn("cache miss", { key: "hotel:1" });

        expect(destination.lines[0]).toMatch(
            /^\d{2}:\d{2}:\d{2} WARN {2}cache miss \{"key":"hotel:1"\}\n$/,
        );
    });
});

describe("formatReadableLine", () => {
    it("omits the context when it is empty", () => {
        const line = JSON.stringify({
            level: "info",
            time: "2026-10-15T12:34:56.000Z",
            msg: "ready",
        });

        expect(formatReadableLine(line)).toBe("12:34:56 INFO  ready\n");
    });
});
