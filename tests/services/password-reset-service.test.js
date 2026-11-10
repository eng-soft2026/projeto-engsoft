import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    FORGOT_PASSWORD_RATE_LIMIT,
    RESET_PASSWORD_RATE_LIMIT,
} from "../../src/constants/password-reset.js";
import { createRateLimiter } from "../../src/lib/rate-limiter.js";
import {
    PASSWORD_RESET_PUBLISH_FAILURE_LOG_MESSAGE,
    createPasswordResetService,
} from "../../src/services/password-reset-service.js";
import { createFakeClock } from "../helpers/factories/index.js";
import { createFakeRedis } from "../helpers/fake-redis.js";

const RAW_TOKEN = "dG9rZW4tZGUtcmVjdXBlcmFjYW8tYWxlYXRvcmlv";
const RAW_TOKEN_HASH = createHash("sha256").update(RAW_TOKEN).digest("hex");
const IP_ADDRESS = "203.0.113.7";
const NEW_PASSWORD = "novaSenha1";

const USER = Object.freeze({
    id: "user-1",
    name: "Ana Souza",
    email: "ana@example.com",
    cpf: "52998224725",
    role: "CUSTOMER",
    isActive: true,
});

function createFakeUserRepository() {
    const users = new Map([[USER.id, { ...USER }]]);
    return {
        users,
        findByEmail: vi.fn(
            async (email) =>
                [...users.values()].find((user) => user.email === email) ??
                null,
        ),
        findById: vi.fn(async (id) => users.get(id) ?? null),
        update: vi.fn(async (id, data) => {
            const user = { ...users.get(id), ...data };
            users.set(id, user);
            return user;
        }),
    };
}

function createFakeTokenRepository() {
    const tokens = [];
    return {
        tokens,
        create: vi.fn(async (data) => {
            const token = {
                id: `token-${tokens.length + 1}`,
                usedAt: null,
                ...data,
            };
            tokens.push(token);
            return token;
        }),
        findByTokenHash: vi.fn(
            async (tokenHash) =>
                tokens.find((token) => token.tokenHash === tokenHash) ?? null,
        ),
        markUsedIfActive: vi.fn(async ({ id, usedAt }) => {
            const token = tokens.find((stored) => stored.id === id);
            if (!token || token.usedAt !== null || token.expiresAt <= usedAt) {
                return false;
            }
            token.usedAt = usedAt;
            return true;
        }),
        invalidateActiveByUser: vi.fn(async ({ userId, usedAt }) => {
            const active = tokens.filter(
                (token) => token.userId === userId && token.usedAt === null,
            );
            active.forEach((token) => {
                token.usedAt = usedAt;
            });
            return active.length;
        }),
    };
}

function createFakePasswordHasher() {
    return { hash: vi.fn(async (password) => `hashed:${password}`) };
}

function createFakeTransactionRunner() {
    const client = { name: "transaction-client" };
    return { client, run: vi.fn(async (work) => work(client)) };
}

function createFakeLogger() {
    return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

describe("passwordResetService", () => {
    let clock;
    let redis;
    let userRepository;
    let passwordResetTokenRepository;
    let passwordHasher;
    let transactionRunner;
    let eventPublisher;
    let logger;
    let generateToken;
    let service;

    function createService(overrides = {}) {
        return createPasswordResetService({
            userRepository,
            passwordResetTokenRepository,
            passwordHasher,
            transactionRunner,
            eventPublisher,
            forgotPasswordRateLimiter: createRateLimiter({
                ...FORGOT_PASSWORD_RATE_LIMIT,
                getRedis: async () => redis,
                logger,
            }),
            resetPasswordRateLimiter: createRateLimiter({
                ...RESET_PASSWORD_RATE_LIMIT,
                getRedis: async () => redis,
                logger,
            }),
            generateToken,
            clock: clock.now,
            logger,
            ...overrides,
        });
    }

    async function issueToken() {
        await service.requestReset({
            email: USER.email,
            ipAddress: IP_ADDRESS,
        });
    }

    beforeEach(() => {
        clock = createFakeClock();
        redis = createFakeRedis({ now: clock.now });
        userRepository = createFakeUserRepository();
        passwordResetTokenRepository = createFakeTokenRepository();
        passwordHasher = createFakePasswordHasher();
        transactionRunner = createFakeTransactionRunner();
        eventPublisher = { publish: vi.fn(async () => {}) };
        logger = createFakeLogger();
        generateToken = vi.fn(() => RAW_TOKEN);
        service = createService();
    });

    describe("requestReset", () => {
        it("stores only the token hash, valid for 1 hour, inside a transaction", async () => {
            await issueToken();

            expect(passwordResetTokenRepository.create).toHaveBeenCalledWith(
                {
                    userId: USER.id,
                    tokenHash: RAW_TOKEN_HASH,
                    expiresAt: new Date("2026-01-01T13:00:00.000Z"),
                },
                transactionRunner.client,
            );
            expect(
                JSON.stringify(passwordResetTokenRepository.tokens),
            ).not.toContain(RAW_TOKEN);
        });

        it("publishes PASSWORD_RESET_REQUESTED with the raw token for the e-mail", async () => {
            await issueToken();

            expect(eventPublisher.publish).toHaveBeenCalledWith({
                type: "PASSWORD_RESET_REQUESTED",
                userId: USER.id,
                email: USER.email,
                name: USER.name,
                token: RAW_TOKEN,
                expiresAt: new Date("2026-01-01T13:00:00.000Z"),
                occurredAt: new Date("2026-01-01T12:00:00.000Z"),
            });
        });

        it("invalidates the tokens still active when a new one is requested", async () => {
            generateToken.mockReturnValueOnce("primeiro-token");
            await issueToken();
            clock.advance({ minutes: 5 });

            await issueToken();

            const [first, second] = passwordResetTokenRepository.tokens;
            expect(first.usedAt).toEqual(clock.now());
            expect(second.usedAt).toBeNull();
        });

        it("resolves the same way for an unknown e-mail, without a token or event", async () => {
            const result = await service.requestReset({
                email: "ninguem@example.com",
                ipAddress: IP_ADDRESS,
            });

            expect(result).toBeUndefined();
            expect(passwordResetTokenRepository.create).not.toHaveBeenCalled();
            expect(eventPublisher.publish).not.toHaveBeenCalled();
        });

        it("resolves the same way for an inactive user, without a token or event", async () => {
            userRepository.users.set(USER.id, { ...USER, isActive: false });

            const result = await service.requestReset({
                email: USER.email,
                ipAddress: IP_ADDRESS,
            });

            expect(result).toBeUndefined();
            expect(passwordResetTokenRepository.create).not.toHaveBeenCalled();
            expect(eventPublisher.publish).not.toHaveBeenCalled();
        });

        it("logs and swallows a publisher failure, so the answer stays the same", async () => {
            eventPublisher.publish.mockRejectedValueOnce(
                new Error("broker down"),
            );

            await expect(issueToken()).resolves.toBeUndefined();

            expect(logger.error).toHaveBeenCalledWith(
                PASSWORD_RESET_PUBLISH_FAILURE_LOG_MESSAGE,
                expect.objectContaining({ userId: USER.id }),
            );
        });

        it("limits 5 requests per IP and e-mail in 15 minutes, existing or not", async () => {
            const request = {
                email: "ninguem@example.com",
                ipAddress: IP_ADDRESS,
            };
            for (let attempt = 0; attempt < 5; attempt += 1) {
                await service.requestReset(request);
            }

            await expect(service.requestReset(request)).rejects.toMatchObject({
                code: "RATE_LIMITED",
                retryAfterSeconds: 900,
            });
        });

        it("counts each IP and e-mail pair separately", async () => {
            for (let attempt = 0; attempt < 5; attempt += 1) {
                await service.requestReset({
                    email: "ninguem@example.com",
                    ipAddress: IP_ADDRESS,
                });
            }

            await expect(issueToken()).resolves.toBeUndefined();
        });

        it("allows new requests once the window expires", async () => {
            for (let attempt = 0; attempt < 5; attempt += 1) {
                await issueToken();
            }
            clock.advance({ minutes: 15 });

            await expect(issueToken()).resolves.toBeUndefined();
        });
    });

    describe("resetPassword", () => {
        it("stores the new password hash and marks the token as used in one transaction", async () => {
            await issueToken();
            clock.advance({ minutes: 30 });

            await service.resetPassword({
                token: RAW_TOKEN,
                newPassword: NEW_PASSWORD,
                ipAddress: IP_ADDRESS,
            });

            expect(passwordHasher.hash).toHaveBeenCalledWith(NEW_PASSWORD);
            expect(userRepository.update).toHaveBeenCalledWith(
                USER.id,
                { passwordHash: `hashed:${NEW_PASSWORD}` },
                transactionRunner.client,
            );
            expect(passwordResetTokenRepository.tokens[0].usedAt).toEqual(
                clock.now(),
            );
        });

        it("rejects a reused token", async () => {
            await issueToken();
            const input = {
                token: RAW_TOKEN,
                newPassword: NEW_PASSWORD,
                ipAddress: IP_ADDRESS,
            };
            await service.resetPassword(input);

            await expect(
                service.resetPassword({ ...input, newPassword: "outraSenha2" }),
            ).rejects.toMatchObject({ code: "INVALID_RESET_TOKEN" });
            expect(userRepository.update).toHaveBeenCalledTimes(1);
        });

        it("rejects an expired token", async () => {
            await issueToken();
            clock.advance({ hours: 1 });

            await expect(
                service.resetPassword({
                    token: RAW_TOKEN,
                    newPassword: NEW_PASSWORD,
                    ipAddress: IP_ADDRESS,
                }),
            ).rejects.toMatchObject({
                code: "INVALID_RESET_TOKEN",
                message:
                    "Link de recuperação inválido ou expirado. Solicite um novo.",
            });
            expect(userRepository.update).not.toHaveBeenCalled();
        });

        it("rejects an unknown token", async () => {
            await expect(
                service.resetPassword({
                    token: "token-que-nao-existe",
                    newPassword: NEW_PASSWORD,
                    ipAddress: IP_ADDRESS,
                }),
            ).rejects.toMatchObject({ code: "INVALID_RESET_TOKEN" });
            expect(passwordHasher.hash).not.toHaveBeenCalled();
        });

        it("rejects a token replaced by a newer request", async () => {
            generateToken.mockReturnValueOnce("primeiro-token");
            await issueToken();
            await issueToken();

            await expect(
                service.resetPassword({
                    token: "primeiro-token",
                    newPassword: NEW_PASSWORD,
                    ipAddress: IP_ADDRESS,
                }),
            ).rejects.toMatchObject({ code: "INVALID_RESET_TOKEN" });
        });

        it("rejects the token of a user deactivated after the request", async () => {
            await issueToken();
            userRepository.users.set(USER.id, { ...USER, isActive: false });

            await expect(
                service.resetPassword({
                    token: RAW_TOKEN,
                    newPassword: NEW_PASSWORD,
                    ipAddress: IP_ADDRESS,
                }),
            ).rejects.toMatchObject({ code: "INVALID_RESET_TOKEN" });
            expect(userRepository.update).not.toHaveBeenCalled();
        });

        it("keeps the password when a concurrent reset used the token first", async () => {
            await issueToken();
            passwordResetTokenRepository.markUsedIfActive.mockResolvedValueOnce(
                false,
            );

            await expect(
                service.resetPassword({
                    token: RAW_TOKEN,
                    newPassword: NEW_PASSWORD,
                    ipAddress: IP_ADDRESS,
                }),
            ).rejects.toMatchObject({ code: "INVALID_RESET_TOKEN" });
            expect(userRepository.update).not.toHaveBeenCalled();
        });

        it("limits 10 invalid attempts per IP in 15 minutes", async () => {
            const input = {
                token: "token-que-nao-existe",
                newPassword: NEW_PASSWORD,
                ipAddress: IP_ADDRESS,
            };
            for (let attempt = 0; attempt < 10; attempt += 1) {
                await expect(
                    service.resetPassword(input),
                ).rejects.toMatchObject({ code: "INVALID_RESET_TOKEN" });
            }
            await issueToken();

            await expect(
                service.resetPassword({ ...input, token: RAW_TOKEN }),
            ).rejects.toMatchObject({
                code: "RATE_LIMITED",
                retryAfterSeconds: 900,
            });
            expect(userRepository.update).not.toHaveBeenCalled();
        });
    });
});
