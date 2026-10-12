import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    SESSION_MAX_AGE_SECONDS,
    addIdentityToSession,
    addRoleToToken,
    authConfig,
    authorizeCredentials,
} from "../../../src/modules/auth/auth-config.js";

const { verifyCredentials } = vi.hoisted(() => ({
    verifyCredentials: vi.fn(),
}));

vi.mock("../../../src/services/auth-service.js", () => ({
    authService: { verifyCredentials },
}));

const SESSION_USER = Object.freeze({
    id: "user-1",
    name: "Ana Souza",
    email: "ana@example.com",
    role: "MANAGER",
});

describe("authorizeCredentials", () => {
    beforeEach(() => {
        verifyCredentials.mockReset();
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
