import { describe, expect, it } from "vitest";
import { Decimal } from "../../../src/generated/prisma/internal/prismaNamespace.ts";
import {
    hasCoordinates,
    roundCoordinate,
    toClientUnit,
} from "../../../src/modules/units/unit-location.js";

describe("unit location helpers", () => {
    it("converts decimal coordinates into plain numbers", () => {
        const unit = toClientUnit({
            id: "unit-1",
            address: {
                city: "São Paulo",
                latitude: new Decimal("-23.550520"),
                longitude: new Decimal("-46.633308"),
            },
        });

        expect(unit).toEqual({
            id: "unit-1",
            address: {
                city: "São Paulo",
                latitude: -23.55052,
                longitude: -46.633308,
            },
        });
    });

    it("keeps missing coordinates as null", () => {
        const unit = toClientUnit({
            id: "unit-1",
            address: { latitude: null, longitude: null },
        });

        expect(unit.address).toEqual({ latitude: null, longitude: null });
        expect(hasCoordinates(unit.address)).toBe(false);
    });

    it("detects coordinates", () => {
        expect(hasCoordinates({ latitude: -23.5, longitude: -46.6 })).toBe(
            true,
        );
        expect(hasCoordinates({ latitude: -23.5, longitude: null })).toBe(
            false,
        );
    });

    it("rounds coordinates to six decimal places", () => {
        expect(roundCoordinate(-23.5505201234)).toBe(-23.55052);
        expect(roundCoordinate(-46.6333087)).toBe(-46.633309);
    });
});
