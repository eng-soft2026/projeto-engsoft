import { describe, expect, it } from "vitest";
import {
    createDecimalPattern,
    formatDecimal,
    toDecimalString,
} from "../../src/utils/money.js";

describe("toDecimalString", () => {
    it("pads to 2 places without going through float arithmetic", () => {
        expect(toDecimalString("350")).toBe("350.00");
        expect(toDecimalString("0.1")).toBe("0.10");
        expect(toDecimalString("99999999.99")).toBe("99999999.99");
    });
});

describe("formatDecimal", () => {
    it("returns null for a missing value", () => {
        expect(formatDecimal(null)).toBeNull();
        expect(formatDecimal(undefined)).toBeNull();
    });

    it("formats a stored value with 2 places", () => {
        expect(formatDecimal("12.5")).toBe("12.50");
    });
});

describe("createDecimalPattern", () => {
    it("limits the integer digits and allows at most 2 decimal places", () => {
        const pattern = createDecimalPattern(3);

        expect(pattern.test("999")).toBe(true);
        expect(pattern.test("999.99")).toBe(true);
        expect(pattern.test("1000")).toBe(false);
        expect(pattern.test("9.999")).toBe(false);
        expect(pattern.test("-1")).toBe(false);
    });
});
