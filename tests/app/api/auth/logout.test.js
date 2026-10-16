import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../../../../src/lib/logger.js";
import { POST } from "../../../../src/app/api/auth/logout/route.js";

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }));

vi.mock("../../../../src/modules/auth/auth.js", () => ({ signOut }));

describe("POST /api/auth/logout", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        signOut.mockResolvedValue({});
    });

    it("ends the session without redirecting", async () => {
        const response = await POST();

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ success: true, data: null });
        expect(signOut).toHaveBeenCalledWith({ redirect: false });
    });

    it("returns 500 INTERNAL_ERROR when Auth.js fails", async () => {
        vi.spyOn(logger, "error").mockImplementation(() => {});
        signOut.mockRejectedValueOnce(new Error("boom"));

        const response = await POST();

        expect(response.status).toBe(500);
        expect((await response.json()).error.code).toBe("INTERNAL_ERROR");
        vi.restoreAllMocks();
    });
});
