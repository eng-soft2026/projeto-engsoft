import { afterEach, describe, expect, it, vi } from "vitest";
import {
    ConflictError,
    DomainError,
    ERROR_CODES,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
    ValidationError,
} from "../../src/lib/errors.js";
import {
    getHttpStatus,
    jsonError,
    jsonSuccess,
} from "../../src/lib/route-response.js";

describe("getHttpStatus", () => {
    it.each([
        [new ValidationError("Inválido."), 400],
        [new UnauthorizedError("Faça login."), 401],
        [new ForbiddenError("Negado."), 403],
        [new NotFoundError(ERROR_CODES.USER_NOT_FOUND, "Não encontrado."), 404],
        [new ConflictError(ERROR_CODES.USER_ALREADY_EXISTS, "Já existe."), 409],
        [new DomainError(ERROR_CODES.HOLD_EXPIRED, "Expirou."), 400],
    ])("maps %s to %i", (error, status) => {
        expect(getHttpStatus(error)).toBe(status);
    });
});

describe("jsonSuccess", () => {
    it("returns the success envelope with status 200 by default", async () => {
        const response = jsonSuccess({ id: "1" });

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            success: true,
            data: { id: "1" },
        });
    });

    it("accepts a custom status", () => {
        expect(jsonSuccess(null, 201).status).toBe(201);
    });
});

describe("jsonError", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("returns the error envelope of a DomainError with its status", async () => {
        const response = jsonError(
            new ConflictError(ERROR_CODES.USER_ALREADY_EXISTS, "Já existe."),
        );

        expect(response.status).toBe(409);
        expect(await response.json()).toEqual({
            success: false,
            error: { code: "USER_ALREADY_EXISTS", message: "Já existe." },
        });
    });

    it("hides unexpected errors behind INTERNAL_ERROR", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const response = jsonError(new Error("secret internal detail"));
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.error.code).toBe("INTERNAL_ERROR");
        expect(JSON.stringify(body)).not.toContain("secret internal detail");
    });

    it("logs only the name and code of unexpected errors", () => {
        const consoleError = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});
        const error = Object.assign(new Error("passwordHash=abc"), {
            code: "P2002",
        });

        jsonError(error);

        expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
            "passwordHash",
        );
        expect(consoleError).toHaveBeenCalledWith(expect.any(String), {
            name: "Error",
            code: "P2002",
        });
    });
});
