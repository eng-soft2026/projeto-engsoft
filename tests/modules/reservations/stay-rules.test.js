import { describe, expect, it } from "vitest";
import { validateStay } from "../../../src/modules/reservations/stay-rules.js";

const now = new Date("2026-10-10T10:00:00Z");

describe("validateStay", () => {
    it("accepts a regular future stay", () => {
        const result = validateStay({
            checkIn: new Date("2026-10-20T14:00:00Z"),
            checkOut: new Date("2026-10-22T12:00:00Z"),
            now,
        });

        expect(result).toEqual({ isValid: true });
    });

    it("rejects check-out equal to check-in (RN018)", () => {
        const date = new Date("2026-10-20T14:00:00Z");

        expect(validateStay({ checkIn: date, checkOut: date, now })).toEqual({
            isValid: false,
            code: "INVALID_DATE_RANGE",
        });
    });

    it("rejects check-out before check-in (RN018)", () => {
        const result = validateStay({
            checkIn: new Date("2026-10-22T14:00:00Z"),
            checkOut: new Date("2026-10-20T12:00:00Z"),
            now,
        });

        expect(result.code).toBe("INVALID_DATE_RANGE");
    });

    it("accepts a same-day stay with 2 hours of notice (RN019)", () => {
        const result = validateStay({
            checkIn: new Date("2026-10-10T12:00:00Z"),
            checkOut: new Date("2026-10-11T12:00:00Z"),
            now,
        });

        expect(result.isValid).toBe(true);
    });

    it("accepts a stay with exactly 1 hour of notice (RN020)", () => {
        const result = validateStay({
            checkIn: new Date("2026-10-10T11:00:00Z"),
            checkOut: new Date("2026-10-11T12:00:00Z"),
            now,
        });

        expect(result.isValid).toBe(true);
    });

    it("rejects a same-day stay with less than 1 hour of notice (RN020)", () => {
        const result = validateStay({
            checkIn: new Date("2026-10-10T10:30:00Z"),
            checkOut: new Date("2026-10-11T12:00:00Z"),
            now,
        });

        expect(result).toEqual({ isValid: false, code: "CHECKIN_TOO_SOON" });
    });

    it("accepts a check-in exactly 1 year ahead (RN021)", () => {
        const result = validateStay({
            checkIn: new Date("2027-10-10T10:00:00Z"),
            checkOut: new Date("2027-10-12T12:00:00Z"),
            now,
        });

        expect(result.isValid).toBe(true);
    });

    it("rejects a check-in more than 1 year ahead (RN021)", () => {
        const result = validateStay({
            checkIn: new Date("2027-10-10T10:01:00Z"),
            checkOut: new Date("2027-10-12T12:00:00Z"),
            now,
        });

        expect(result).toEqual({ isValid: false, code: "CHECKIN_TOO_FAR" });
    });
});
