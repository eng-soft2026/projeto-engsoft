import { describe, expect, it } from "vitest";
import { BED_TYPES } from "../../../src/constants/bed-types.js";
import {
    BED_TYPE_OPTIONS,
    formatArea,
    formatBeds,
    formatDecimalForDisplay,
    formatPrice,
} from "../../../src/modules/room-types/room-type-labels.js";

describe("room type labels", () => {
    it("offers one labeled option per bed type", () => {
        expect(BED_TYPE_OPTIONS.map(({ value }) => value)).toEqual(
            Object.values(BED_TYPES),
        );
        expect(BED_TYPE_OPTIONS.every(({ label }) => label)).toBe(true);
    });

    it.each([
        ["350.00", "350,00"],
        ["1234567.89", "1.234.567,89"],
        ["1000", "1.000"],
    ])("formats %s as %s without floats", (value, expected) => {
        expect(formatDecimalForDisplay(value)).toBe(expected);
    });

    it("formats price, area and beds", () => {
        expect(formatPrice("1500.50")).toBe("R$ 1.500,50");
        expect(formatArea("25.50")).toBe("25,50 m²");
        expect(
            formatBeds([
                { bedType: BED_TYPES.DOUBLE, quantity: 1 },
                { bedType: BED_TYPES.SINGLE, quantity: 2 },
            ]),
        ).toBe("1× Casal, 2× Solteiro");
    });
});
