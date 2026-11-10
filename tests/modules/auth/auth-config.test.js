import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    SESSION_MAX_AGE_SECONDS,
    addIdentityToSession,
    addRoleToToken,
    authConfig,
    authorizeCredentials,
    createCredentialsAuthorizer,
} from "../../../src/modules/auth/auth-config.js";
import {
    LoginRateLimitedError,
    buildLoginAttemptKey,
} from "../../../src/modules/auth/login-rate-limit.js";

const { verifyCredentials, loginRateLimiter } = vi.hoisted(() => ({
    verifyCredentials: vi.fn(),
    loginRateLimiter: {
        check: vi.fn(),
        recordFailure: vi.fn(),
        reset: vi.fn(),
    },
}));

vi.mock("../../../src/services/auth-service.js", () => ({
    authService: { verifyCredentials },
}));

vi.mock(
    "../../../src/modules/auth/login-rate-limit.js",
    async (importOriginal) => ({
        ...(await importOriginal()),
        loginRateLimiter,
    }),
);

const SESSION_USER = Object.freeze({
    id: "user-1",
    name: "Ana Souza",
    email: "ana@example.com",
    role: "MANAGER",
});

function createRequest(ipAddress) {
    return new Request("http://localhost/api/auth/callback/credentials", {
        headers: { "x-forwarded-for": ipAddress },
    });
}

describe("authorizeCredentials", () => {
    beforeEach(() => {
        verifyCredentials.mockReset();
        loginRateLimiter.check.mockReset();
        loginRateLimiter.check.mockResolvedValue({
            isLimited: false,
            retryAfterSeconds: 0,
        });
    });

    it("verifies normalized credentials and returns the session user", async () => {
        verifyCredentials.mockResolvedValueOnce(SESSION_USER);

        const user = await authorizeCredentials({
            email: " ANA@EXAMPLE.COM ",
            password: "senhaSegura1",
        });

        expect(user).toBe(SESSION_USER);
        expect(verifyCredentials).toHaveBeenCalledWith({
            email: "ana@example.com",
            password: "senhaSegura1",
        });
    });

    it("returns null when the credentials are wrong", async () => {
        verifyCredentials.mockResolvedValueOnce(null);

        await expect(
            authorizeCredentials({
                email: "ana@example.com",
                password: "errada123",
            }),
        ).resolves.toBeNull();
    });

    it("returns null without querying when the input is invalid", async () => {
        await expect(
            authorizeCredentials({ email: "not-an-email", password: "" }),
        ).resolves.toBeNull();
        expect(verifyCredentials).not.toHaveBeenCalled();
    });
});

describe("createCredentialsAuthorizer", () => {
    const request = createRequest("203.0.113.7");
    const attemptKey = buildLoginAttemptKey({
        email: "ana@example.com",
        request,
    });
    let authService;
    let rateLimiter;
    let authorize;

    beforeEach(() => {
        authService = { verifyCredentials: vi.fn() };
        rateLimiter = {
            check: vi.fn(async () => ({
                isLimited: false,
                retryAfterSeconds: 0,
            })),
            recordFailure: vi.fn(async () => {}),
            reset: vi.fn(async () => {}),
        };
        authorize = createCredentialsAuthorizer({ authService, rateLimiter });
    });

    it("records a failure under the IP and e-mail key when the credentials are wrong", async () => {
        authService.verifyCredentials.mockResolvedValueOnce(null);

        await expect(
            authorize(
                { email: " ANA@EXAMPLE.COM ", password: "errada123" },
                request,
            ),
        ).resolves.toBeNull();
        expect(rateLimiter.check).toHaveBeenCalledWith(attemptKey);
        expect(rateLimiter.recordFailure).toHaveBeenCalledWith(attemptKey);
        expect(rateLimiter.reset).not.toHaveBeenCalled();
    });

    it("resets the counter after a successful sign in", async () => {
        authService.verifyCredentials.mockResolvedValueOnce(SESSION_USER);

        await expect(
            authorize(
                { email: "ana@example.com", password: "senhaSegura1" },
                request,
            ),
        ).resolves.toBe(SESSION_USER);
        expect(rateLimiter.reset).toHaveBeenCalledWith(attemptKey);
        expect(rateLimiter.recordFailure).not.toHaveBeenCalled();
    });

    it("throws LoginRateLimitedError without checking the password when the key is limited", async () => {
        rateLimiter.check.mockResolvedValueOnce({
            isLimited: true,
            retryAfterSeconds: 600,
        });

        const attempt = authorize(
            { email: "ana@example.com", password: "senhaSegura1" },
            request,
        );

        await expect(attempt).rejects.toBeInstanceOf(LoginRateLimitedError);
        await expect(attempt).rejects.toMatchObject({
            retryAfterSeconds: 600,
        });
        expect(authService.verifyCredentials).not.toHaveBeenCalled();
        expect(rateLimiter.recordFailure).not.toHaveBeenCalled();
    });

    it("does not touch the counter when the input is invalid", async () => {
        await expect(
            authorize({ email: "not-an-email", password: "" }, request),
        ).resolves.toBeNull();
        expect(rateLimiter.check).not.toHaveBeenCalled();
    });
});

describe("session callbacks", () => {
    it("adds the role to the token at sign in", () => {
        const token = addRoleToToken({
            token: { sub: "user-1" },
            user: SESSION_USER,
        });

        expect(token).toEqual({ sub: "user-1", role: "MANAGER" });
    });

    it("keeps the token when there is no new sign in", () => {
        const token = { sub: "user-1", role: "MANAGER" };

        expect(addRoleToToken({ token })).toBe(token);
    });

    it("exposes the user id and role in the session", () => {
        const session = addIdentityToSession({
            session: { user: { name: "Ana", email: "ana@example.com" } },
            token: { sub: "user-1", role: "MANAGER" },
        });

        expect(session.user).toEqual({
            name: "Ana",
            email: "ana@example.com",
            id: "user-1",
            role: "MANAGER",
        });
    });
});

describe("authConfig", () => {
    it("uses JWT sessions that expire in 24 hours", () => {
        expect(authConfig.session).toEqual({
            strategy: "jwt",
            maxAge: 24 * 60 * 60,
        });
        expect(SESSION_MAX_AGE_SECONDS).toBe(86400);
    });

    it("registers only the credentials provider", () => {
        expect(authConfig.providers).toHaveLength(1);
        expect(authConfig.providers[0].id).toBe("credentials");
    });
});
