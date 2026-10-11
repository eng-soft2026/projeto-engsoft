export const ERROR_CODES = Object.freeze({
    INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    USER_NOT_FOUND: "USER_NOT_FOUND",
    HOTEL_NOT_FOUND: "HOTEL_NOT_FOUND",
    UNIT_NOT_FOUND: "UNIT_NOT_FOUND",
    ROOM_TYPE_NOT_FOUND: "ROOM_TYPE_NOT_FOUND",
    ROOM_NOT_FOUND: "ROOM_NOT_FOUND",
    ROOM_NOT_AVAILABLE: "ROOM_NOT_AVAILABLE",
    INVALID_BOOKING_PERIOD: "INVALID_BOOKING_PERIOD",
    HOLD_EXPIRED: "HOLD_EXPIRED",
    OVERBOOKING_LIMIT_REACHED: "OVERBOOKING_LIMIT_REACHED",
    RESERVATION_NOT_FOUND: "RESERVATION_NOT_FOUND",
    RESERVATION_CANNOT_BE_CANCELLED: "RESERVATION_CANNOT_BE_CANCELLED",
    RESERVATION_CANNOT_BE_CHANGED: "RESERVATION_CANNOT_BE_CHANGED",
    PAYMENT_FAILED: "PAYMENT_FAILED",
    REFUND_FAILED: "REFUND_FAILED",
    INVALID_GUEST_DATA: "INVALID_GUEST_DATA",
    INVALID_CPF: "INVALID_CPF",
});

export class DomainError extends Error {
    constructor(code, message) {
        super(message);
        this.name = new.target.name;
        this.code = code;
    }
}

export class NotFoundError extends DomainError {}

export class UnauthorizedError extends DomainError {
    constructor(message, code = ERROR_CODES.UNAUTHORIZED) {
        super(code, message);
    }
}

export class ForbiddenError extends DomainError {
    constructor(message) {
        super(ERROR_CODES.FORBIDDEN, message);
    }
}
