import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirectSignedInUser } from "../../../src/modules/auth/redirect-signed-in-user.js";

const { auth, findActiveUser, redirect } = vi.hoisted(() => ({
    auth: vi.fn(),
    findActiveUser: vi.fn(),
    redirect: vi.fn(() => {
        throw new Error("NEXT_REDIRECT");
    }),
}));

vi.mock("../../../src/modules/auth/auth.js", () => ({ auth }));
vi.mock("../../../src/services/auth-service.js", () => ({
    authService: { findActiveUser },
}));
vi.mock("next/navigation", () => ({ redirect }));

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

describe("redirectSignedInUser", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("does nothing for a visitor", async () => {
        auth.mockResolvedValue(null);

        await expect(
            redirectSignedInUser("/reservations"),
        ).resolves.toBeUndefined();
        expect(redirect).not.toHaveBeenCalled();
    });

    it("does nothing when the session user is no longer active", async () => {
        auth.mockResolvedValue({ user: { id: "user-1", role: "CUSTOMER" } });
        findActiveUser.mockResolvedValue(null);

        await redirectSignedInUser("/reservations");

        expect(redirect).not.toHaveBeenCalled();
    });

    it("sends a signed-in user to the callback URL", async () => {
        signInAs(CUSTOMER);

        await expect(redirectSignedInUser("/reservations")).rejects.toThrow(
            "NEXT_REDIRECT",
        );
        expect(redirect).toHaveBeenCalledWith("/reservations");
    });

    it("sends a signed-in user to the home for an unsafe callback URL", async () => {
        signInAs(CUSTOMER);

        await expect(
            redirectSignedInUser("https://evil.example.com"),
        ).rejects.toThrow("NEXT_REDIRECT");
        expect(redirect).toHaveBeenCalledWith("/");
    });
});
