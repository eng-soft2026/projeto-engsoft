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
import { logger } from "../../src/lib/logger.js";
import { runWithRequestStore } from "../../src/lib/request-store.js";
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
        vi.unstubAllEnvs();
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

    it("hides unexpected errors behind INTERNAL_ERROR without message or stack", async () => {
        vi.spyOn(logger, "error").mockImplementation(() => {});
        const response = jsonError(new Error("secret internal detail"));
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.error.code).toBe("INTERNAL_ERROR");
        expect(JSON.stringify(body)).not.toContain("secret internal detail");
        expect(Object.keys(body.error).toSorted()).toEqual(["code", "message"]);
    });

    it("logs unexpected errors in production with the request id, name and code only", () => {
        vi.stubEnv("NODE_ENV", "production");
        const loggerError = vi
            .spyOn(logger, "error")
            .mockImplementation(() => {});
        const error = Object.assign(new Error("passwordHash=abc"), {
            code: "P2002",
        });
        const request = new Request("http://localhost/api/hotels", {
            headers: { "x-request-id": "req-123" },
        });

        jsonError(error, request);

        expect(JSON.stringify(loggerError.mock.calls)).not.toContain(
            "passwordHash",
        );
        expect(loggerError).toHaveBeenCalledWith(expect.any(String), {
            requestId: "req-123",
            error: { name: "Error", code: "P2002" },
        });
    });

    it("generates a request id for the log when the header is missing", () => {
        const loggerError = vi
            .spyOn(logger, "error")
            .mockImplementation(() => {});

        jsonError(new Error("boom"));

        const [, context] = loggerError.mock.calls[0];
        expect(context.requestId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        );
    });

    it("logs the request id of the current request store", () => {
        const loggerError = vi
            .spyOn(logger, "error")
            .mockImplementation(() => {});

        runWithRequestStore({ requestId: "req-store" }, () =>
            jsonError(new Error("boom")),
        );

        const [, context] = loggerError.mock.calls[0];
        expect(context.requestId).toBe("req-store");
    });

    it("does not log domain errors", () => {
        const loggerError = vi
            .spyOn(logger, "error")
            .mockImplementation(() => {});

        jsonError(new NotFoundError(ERROR_CODES.HOTEL_NOT_FOUND, "Não."));

        expect(loggerError).not.toHaveBeenCalled();
    });
});
