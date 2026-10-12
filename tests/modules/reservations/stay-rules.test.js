import { describe, expect, it } from "vitest";
import { ERROR_CODES, ValidationError } from "../../../src/lib/errors.js";
import { validateStay } from "../../../src/modules/reservations/stay-rules.js";

const now = new Date("2026-10-10T10:00:00Z");

const stay = (checkIn, checkOut) => ({
    checkIn: new Date(checkIn),
    checkOut: new Date(checkOut),
    now,
});

const catchError = (callback) => {
    try {
        callback();
    } catch (error) {
        return error;
    }
    return null;
};

const expectInvalidBookingPeriod = (input) => {
    const error = catchError(() => validateStay(input));

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.code).toBe(ERROR_CODES.INVALID_BOOKING_PERIOD);

    return error;
};

describe("validateStay", () => {
    it("accepts a regular future stay", () => {
        expect(() =>
            validateStay(stay("2026-10-20T14:00:00Z", "2026-10-22T12:00:00Z")),
        ).not.toThrow();
    });

    it("rejects check-out equal to check-in (RN018)", () => {
        const error = expectInvalidBookingPeriod(
            stay("2026-10-20T14:00:00Z", "2026-10-20T14:00:00Z"),
        );

        expect(error.message).toMatch(/after check-in/);
    });

    it("rejects check-out before check-in (RN018)", () => {
        const error = expectInvalidBookingPeriod(
            stay("2026-10-22T14:00:00Z", "2026-10-20T12:00:00Z"),
        );

        expect(error.message).toMatch(/after check-in/);
    });

    it("accepts a same-day stay with 2 hours of notice (RN019)", () => {
        expect(() =>
            validateStay(stay("2026-10-10T12:00:00Z", "2026-10-11T12:00:00Z")),
        ).not.toThrow();
    });

    it("accepts a stay with exactly 1 hour of notice (RN020)", () => {
        expect(() =>
            validateStay(stay("2026-10-10T11:00:00Z", "2026-10-11T12:00:00Z")),
        ).not.toThrow();
    });

    it("rejects a same-day stay with less than 1 hour of notice (RN020)", () => {
        const error = expectInvalidBookingPeriod(
            stay("2026-10-10T10:30:00Z", "2026-10-11T12:00:00Z"),
        );

        expect(error.message).toMatch(/at least 1 hour/);
    });

    it("accepts a check-in exactly 1 year ahead (RN021)", () => {
        expect(() =>
            validateStay(stay("2027-10-10T10:00:00Z", "2027-10-12T12:00:00Z")),
        ).not.toThrow();
    });

    it("rejects a check-in more than 1 year ahead (RN021)", () => {
        const error = expectInvalidBookingPeriod(
            stay("2027-10-10T10:01:00Z", "2027-10-12T12:00:00Z"),
        );

        expect(error.message).toMatch(/at most 1 year/);
    });
});
