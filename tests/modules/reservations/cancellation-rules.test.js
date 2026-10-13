import { describe, expect, it } from "vitest";
import { USER_ROLES } from "../../../src/constants/user-roles.js";
import {
    ConflictError,
    ERROR_CODES,
    ForbiddenError,
} from "../../../src/lib/errors.js";
import { evaluateCancellation } from "../../../src/modules/reservations/cancellation-rules.js";

const now = new Date("2026-10-10T10:00:00Z");

const checkInInHours = (hours) =>
    new Date(now.getTime() + hours * 60 * 60 * 1000);

const catchError = (callback) => {
    try {
        callback();
    } catch (error) {
        return error;
    }
    return null;
};

describe("evaluateCancellation as customer", () => {
    const evaluate = (hours) =>
        evaluateCancellation({
            requestedByRole: USER_ROLES.CUSTOMER,
            checkIn: checkInInHours(hours),
            now,
        });

    it("refunds with more than 24 hours of notice (RN039)", () => {
        expect(evaluate(25)).toEqual({ isRefundable: true });
    });

    it("refunds with exactly 24 hours of notice (RN039)", () => {
        expect(evaluate(24)).toEqual({ isRefundable: true });
    });

    it("allows cancelling without refund under 24 hours (RN077)", () => {
        expect(evaluate(23)).toEqual({ isRefundable: false });
    });
});

describe("evaluateCancellation as manager", () => {
    const evaluate = (hours) =>
        evaluateCancellation({
            requestedByRole: USER_ROLES.MANAGER,
            checkIn: checkInInHours(hours),
            now,
        });

    it("allows cancelling with more than 48 hours of notice (RN040)", () => {
        expect(evaluate(49)).toEqual({ isRefundable: true });
    });

    it("allows cancelling with exactly 48 hours of notice (RN040)", () => {
        expect(evaluate(48)).toEqual({ isRefundable: true });
    });

    it("rejects cancelling under 48 hours (RN040)", () => {
        const error = catchError(() => evaluate(47));

        expect(error).toBeInstanceOf(ConflictError);
        expect(error.code).toBe(ERROR_CODES.RESERVATION_CANNOT_BE_CANCELLED);
    });
});

describe("evaluateCancellation with an unsupported role", () => {
    it("rejects the cancellation", () => {
        const error = catchError(() =>
            evaluateCancellation({
                requestedByRole: "UNKNOWN",
                checkIn: checkInInHours(100),
                now,
            }),
        );

        expect(error).toBeInstanceOf(ForbiddenError);
    });
});
