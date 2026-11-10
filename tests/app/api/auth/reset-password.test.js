import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../../../src/app/api/auth/reset-password/route.js";
import {
    ERROR_CODES,
    RateLimitError,
    ValidationError,
} from "../../../../src/lib/errors.js";

const { resetPassword } = vi.hoisted(() => ({ resetPassword: vi.fn() }));

vi.mock("../../../../src/services/password-reset-service.js", () => ({
    passwordResetService: { resetPassword },
}));

const VALID_BODY = Object.freeze({
    token: "token-de-recuperacao",
    newPassword: "novaSenha1",
});

function createRequest(body, headers = {}) {
    return new Request("http://localhost/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: typeof body === "string" ? body : JSON.stringify(body),
    });
}

describe("POST /api/auth/reset-password", () => {
    beforeEach(() => {
        resetPassword.mockReset();
        resetPassword.mockResolvedValue(undefined);
    });

    it("resets the password and answers 200 with no data", async () => {
        const response = await POST(
            createRequest(VALID_BODY, { "x-real-ip": "198.51.100.4" }),
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ success: true, data: null });
        expect(resetPassword).toHaveBeenCalledWith({
            ...VALID_BODY,
            ipAddress: "198.51.100.4",
        });
    });

    it("returns 400 INVALID_RESET_TOKEN for an invalid, expired or used token", async () => {
        resetPassword.mockRejectedValueOnce(
            new ValidationError(
                "Link de recuperação inválido ou expirado. Solicite um novo.",
                ERROR_CODES.INVALID_RESET_TOKEN,
            ),
        );

        const response = await POST(createRequest(VALID_BODY));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            success: false,
            error: {
                code: "INVALID_RESET_TOKEN",
                message:
                    "Link de recuperação inválido ou expirado. Solicite um novo.",
            },
        });
    });

    it("returns 429 RATE_LIMITED with Retry-After", async () => {
        resetPassword.mockRejectedValueOnce(
            new RateLimitError(
                "Muitas tentativas de redefinição de senha. Tente novamente em alguns minutos.",
                600,
            ),
        );

        const response = await POST(createRequest(VALID_BODY));

        expect(response.status).toBe(429);
        expect(response.headers.get("Retry-After")).toBe("600");
    });

    it("returns 400 VALIDATION_ERROR for a weak new password", async () => {
        const response = await POST(
            createRequest({ ...VALID_BODY, newPassword: "abcdefgh" }),
        );

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            success: false,
            error: {
                code: "VALIDATION_ERROR",
                message: "A senha deve conter pelo menos um número.",
            },
        });
        expect(resetPassword).not.toHaveBeenCalled();
    });

    it("rejects a request that is not JSON", async () => {
        const response = await POST(
            createRequest("token=x", {
                "content-type": "application/x-www-form-urlencoded",
            }),
        );

        expect(response.status).toBe(400);
        expect(resetPassword).not.toHaveBeenCalled();
    });
});
