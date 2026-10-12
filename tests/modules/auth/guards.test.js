import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, UnauthorizedError } from "../../../src/lib/errors.js";
import {
    LOGIN_PATH,
    getCurrentUser,
    requireAuth,
    requirePageAuth,
    requirePageRole,
    requireRole,
} from "../../../src/modules/auth/guards.js";

const { auth, findActiveUser, redirect, notFound } = vi.hoisted(() => ({
    auth: vi.fn(),
    findActiveUser: vi.fn(),
    redirect: vi.fn(() => {
        throw new Error("NEXT_REDIRECT");
    }),
    notFound: vi.fn(() => {
        throw new Error("NEXT_NOT_FOUND");
    }),
}));

vi.mock("../../../src/modules/auth/auth.js", () => ({ auth }));
vi.mock("../../../src/services/auth-service.js", () => ({
    authService: { findActiveUser },
}));
vi.mock("next/navigation", () => ({ redirect, notFound }));

const CUSTOMER = Object.freeze({
    id: "user-1",
    name: "Ana Souza",
    role: "CUSTOMER",
    isActive: true,
});

function signInAs(user) {
    auth.mockResolvedValue({ user: { id: user.id, role: user.role } });
    findActiveUser.mockResolvedValue(user);
}

describe("auth guards", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        auth.mockResolvedValue(null);
        findActiveUser.mockResolvedValue(null);
    });

    describe("getCurrentUser", () => {
        it("returns null without a session", async () => {
            await expect(getCurrentUser()).resolves.toBeNull();
            expect(findActiveUser).not.toHaveBeenCalled();
        });

        it("loads the user from the database by the session id", async () => {
            signInAs(CUSTOMER);

            await expect(getCurrentUser()).resolves.toBe(CUSTOMER);
            expect(findActiveUser).toHaveBeenCalledWith("user-1");
        });

        it("returns null when the user is no longer active", async () => {
            auth.mockResolvedValue({ user: { id: "user-1" } });
            findActiveUser.mockResolvedValue(null);

            await expect(getCurrentUser()).resolves.toBeNull();
        });
    });

    describe("requireAuth", () => {
        it("throws UNAUTHORIZED without a session", async () => {
            await expect(requireAuth()).rejects.toThrow(UnauthorizedError);
        });

        it("throws UNAUTHORIZED for a deactivated user with a valid token", async () => {
            auth.mockResolvedValue({ user: { id: "user-1" } });

            await expect(requireAuth()).rejects.toMatchObject({
                code: "UNAUTHORIZED",
            });
        });

        it("returns the authenticated user", async () => {
            signInAs(CUSTOMER);

            await expect(requireAuth()).resolves.toBe(CUSTOMER);
        });
    });

    describe("requireRole", () => {
        it("throws UNAUTHORIZED without a session", async () => {
            await expect(requireRole(["ADMIN"])).rejects.toThrow(
                UnauthorizedError,
            );
        });

        it("throws FORBIDDEN when the role is not allowed", async () => {
            signInAs(CUSTOMER);

            await expect(requireRole(["MANAGER", "ADMIN"])).rejects.toThrow(
                ForbiddenError,
            );
        });

        it("does not let ADMIN in unless it is listed", async () => {
            signInAs({ ...CUSTOMER, role: "ADMIN" });

            await expect(requireRole(["MANAGER"])).rejects.toThrow(
                ForbiddenError,
            );
        });

        it("returns the user when the role is allowed", async () => {
            const manager = { ...CUSTOMER, role: "MANAGER" };
            signInAs(manager);

            await expect(requireRole(["MANAGER", "ADMIN"])).resolves.toBe(
                manager,
            );
        });

        it("uses the current role from the database, not the token", async () => {
            auth.mockResolvedValue({ user: { id: "user-1", role: "ADMIN" } });
            findActiveUser.mockResolvedValue(CUSTOMER);

            await expect(requireRole(["ADMIN"])).rejects.toThrow(
                ForbiddenError,
            );
        });
    });

    describe("requirePageAuth", () => {
        it("redirects to the login page without a session", async () => {
            await expect(requirePageAuth()).rejects.toThrow("NEXT_REDIRECT");
            expect(redirect).toHaveBeenCalledWith(LOGIN_PATH);
        });

        it("returns the authenticated user", async () => {
            signInAs(CUSTOMER);

            await expect(requirePageAuth()).resolves.toBe(CUSTOMER);
        });
    });

    describe("requirePageRole", () => {
        it("redirects to the login page without a session", async () => {
            await expect(requirePageRole(["ADMIN"])).rejects.toThrow(
                "NEXT_REDIRECT",
            );
        });

        it("renders not found when the role is not allowed", async () => {
            signInAs(CUSTOMER);

            await expect(requirePageRole(["ADMIN"])).rejects.toThrow(
                "NEXT_NOT_FOUND",
            );
            expect(notFound).toHaveBeenCalled();
        });

        it("returns the user when the role is allowed", async () => {
            signInAs(CUSTOMER);

            await expect(requirePageRole(["CUSTOMER"])).resolves.toBe(CUSTOMER);
        });
    });
});
