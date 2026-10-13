import { describe, expect, it } from "vitest";
import {
    ConflictError,
    DomainError,
    ERROR_CODES,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
    ValidationError,
} from "../../src/lib/errors.js";

const SPEC_CODES = [
    "INVALID_CREDENTIALS",
    "UNAUTHORIZED",
    "FORBIDDEN",
    "USER_NOT_FOUND",
    "HOTEL_NOT_FOUND",
    "INVALID_HOTEL_STATUS",
    "HOTEL_MANAGER_NOT_FOUND",
    "HOTEL_MANAGER_ALREADY_EXISTS",
    "UNIT_NOT_FOUND",
    "ROOM_TYPE_NOT_FOUND",
    "ROOM_NOT_FOUND",
    "ROOM_NOT_AVAILABLE",
    "INVALID_BOOKING_PERIOD",
    "HOLD_EXPIRED",
    "OVERBOOKING_LIMIT_REACHED",
    "RESERVATION_NOT_FOUND",
    "RESERVATION_CANNOT_BE_CANCELLED",
    "RESERVATION_CANNOT_BE_CHANGED",
    "PAYMENT_FAILED",
    "REFUND_FAILED",
    "INVALID_GUEST_DATA",
    "INVALID_CPF",
    "INVALID_CNPJ",
    "VALIDATION_ERROR",
    "USER_ALREADY_EXISTS",
    "INTERNAL_ERROR",
];

describe("ERROR_CODES", () => {
    it("contains exactly the codes from the API spec", () => {
        expect(Object.keys(ERROR_CODES).sort()).toEqual([...SPEC_CODES].sort());
    });

    it("maps every key to the same string", () => {
        for (const [key, value] of Object.entries(ERROR_CODES)) {
            expect(value).toBe(key);
        }
    });

    it("is frozen", () => {
        expect(Object.isFrozen(ERROR_CODES)).toBe(true);
    });
});

describe("DomainError", () => {
    it("exposes code and message and is an Error", () => {
        const error = new DomainError(
            ERROR_CODES.HOLD_EXPIRED,
            "Reserva expirada.",
        );

        expect(error).toBeInstanceOf(Error);
        expect(error.code).toBe("HOLD_EXPIRED");
        expect(error.message).toBe("Reserva expirada.");
        expect(error.name).toBe("DomainError");
    });
});

describe("NotFoundError", () => {
    it("is a DomainError that keeps the given code", () => {
        const error = new NotFoundError(
            ERROR_CODES.HOTEL_NOT_FOUND,
            "Hotel não encontrado.",
        );

        expect(error).toBeInstanceOf(DomainError);
        expect(error.code).toBe("HOTEL_NOT_FOUND");
        expect(error.name).toBe("NotFoundError");
    });
});

describe("UnauthorizedError", () => {
    it("defaults to the UNAUTHORIZED code", () => {
        const error = new UnauthorizedError("Faça login.");

        expect(error).toBeInstanceOf(DomainError);
        expect(error.code).toBe("UNAUTHORIZED");
        expect(error.message).toBe("Faça login.");
    });

    it("accepts INVALID_CREDENTIALS as code", () => {
        const error = new UnauthorizedError(
            "Credenciais inválidas.",
            ERROR_CODES.INVALID_CREDENTIALS,
        );

        expect(error.code).toBe("INVALID_CREDENTIALS");
    });
});

describe("ConflictError", () => {
    it("is a DomainError that keeps the given code", () => {
        const error = new ConflictError(
            ERROR_CODES.USER_ALREADY_EXISTS,
            "Conta já existe.",
        );

        expect(error).toBeInstanceOf(DomainError);
        expect(error.code).toBe("USER_ALREADY_EXISTS");
        expect(error.name).toBe("ConflictError");
    });
});

describe("ValidationError", () => {
    it("defaults to the VALIDATION_ERROR code", () => {
        const error = new ValidationError("Dados inválidos.");

        expect(error).toBeInstanceOf(DomainError);
        expect(error.code).toBe("VALIDATION_ERROR");
        expect(error.message).toBe("Dados inválidos.");
    });

    it("accepts a specific code such as INVALID_CPF", () => {
        const error = new ValidationError(
            "CPF inválido.",
            ERROR_CODES.INVALID_CPF,
        );

        expect(error.code).toBe("INVALID_CPF");
    });
});

describe("ForbiddenError", () => {
    it("uses the FORBIDDEN code", () => {
        const error = new ForbiddenError("Acesso negado.");

        expect(error).toBeInstanceOf(DomainError);
        expect(error.code).toBe("FORBIDDEN");
    });
});
