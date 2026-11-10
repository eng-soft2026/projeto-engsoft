import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../../../src/app/api/auth/forgot-password/route.js";
import { RateLimitError } from "../../../../src/lib/errors.js";

const { requestReset } = vi.hoisted(() => ({ requestReset: vi.fn() }));

vi.mock("../../../../src/services/password-reset-service.js", () => ({
    passwordResetService: { requestReset },
}));

function createRequest(body, headers = {}) {
    return new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: typeof body === "string" ? body : JSON.stringify(body),
    });
}

describe("POST /api/auth/forgot-password", () => {
    beforeEach(() => {
        requestReset.mockReset();
        requestReset.mockResolvedValue(undefined);
    });

    it("passes the normalized e-mail and the client IP to the service", async () => {
        const response = await POST(
            createRequest(
                { email: " ANA@EXAMPLE.COM " },
                { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
            ),
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ success: true, data: null });
        expect(requestReset).toHaveBeenCalledWith({
            email: "ana@example.com",
            ipAddress: "203.0.113.7",
        });
    });

    it("answers the same body whether or not the e-mail has an account", async () => {
        const existing = await POST(
            createRequest({ email: "ana@example.com" }),
        );
        const unknown = await POST(
            createRequest({ email: "ninguem@example.com" }),
        );

        expect(unknown.status).toBe(existing.status);
        expect(await unknown.text()).toBe(await existing.text());
    });

    it("returns 429 RATE_LIMITED with Retry-After", async () => {
        requestReset.mockRejectedValueOnce(
            new RateLimitError(
                "Muitas solicitações de recuperação de senha. Tente novamente em alguns minutos.",
                900,
            ),
        );

        const response = await POST(
            createRequest({ email: "ana@example.com" }),
        );

        expect(response.status).toBe(429);
        expect(response.headers.get("Retry-After")).toBe("900");
        expect((await response.json()).error.code).toBe("RATE_LIMITED");
    });

    it("returns 400 VALIDATION_ERROR for an invalid e-mail", async () => {
        const response = await POST(createRequest({ email: "not-an-email" }));

        expect(response.status).toBe(400);
        expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
        expect(requestReset).not.toHaveBeenCalled();
    });

    it("rejects a request that is not JSON", async () => {
        const response = await POST(
            createRequest("email=ana%40example.com", {
                "content-type": "application/x-www-form-urlencoded",
            }),
        );

        expect(response.status).toBe(400);
        expect(requestReset).not.toHaveBeenCalled();
    });
});
