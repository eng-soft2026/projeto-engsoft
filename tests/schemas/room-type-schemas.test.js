import { describe, expect, it } from "vitest";
import {
    createRoomTypeSchema,
    roomTypeParamsSchema,
    updateRoomTypeSchema,
} from "../../src/schemas/room-type-schemas.js";

const UUID = "3f1c2a4e-8b7d-4c6a-9e21-5d0b7a1c9f33";

const VALID_INPUT = Object.freeze({
    name: "  Suíte Master ",
    description: "Suíte com vista para o mar.",
    maxGuests: 3,
    areaM2: 42.5,
    defaultPrice: "350",
    beds: [
        { bedType: "KING", quantity: 1 },
        { bedType: "SOFA_BED", quantity: 1 },
    ],
});

function parseCreate(overrides) {
    return createRoomTypeSchema.safeParse({ ...VALID_INPUT, ...overrides });
}

describe("createRoomTypeSchema", () => {
    it("normalizes the text and keeps money and area as strings with 2 places", () => {
        const result = parseCreate({});

        expect(result.success).toBe(true);
        expect(result.data).toMatchObject({
            name: "Suíte Master",
            areaM2: "42.50",
            defaultPrice: "350.00",
        });
    });

    it.each([
        ["three decimal places", "10.999"],
        ["zero", 0],
        ["a negative value", -1],
        ["a thousands separator", "1,000.00"],
        ["scientific notation", 1e21],
        ["above the DECIMAL(10,2) ceiling", "100000000"],
        ["text", "abc"],
        ["an empty string", ""],
    ])("rejects a default price with %s (DT020)", (label, defaultPrice) => {
        expect(parseCreate({ defaultPrice }).success).toBe(false);
    });

    it("accepts the highest price DECIMAL(10,2) holds", () => {
        const result = parseCreate({ defaultPrice: "99999999.99" });

        expect(result.data.defaultPrice).toBe("99999999.99");
    });

    it("rejects an area above DECIMAL(7,2) or not positive", () => {
        expect(parseCreate({ areaM2: "100000" }).success).toBe(false);
        expect(parseCreate({ areaM2: 0 }).success).toBe(false);
    });

    it("rejects a capacity below 1, above the limit or not an integer", () => {
        expect(parseCreate({ maxGuests: 0 }).success).toBe(false);
        expect(parseCreate({ maxGuests: 51 }).success).toBe(false);
        expect(parseCreate({ maxGuests: 2.5 }).success).toBe(false);
    });

    it("requires 1 to 10 bed configurations", () => {
        expect(parseCreate({ beds: [] }).success).toBe(false);
        expect(parseCreate({ beds: undefined }).success).toBe(false);
    });

    it("rejects a repeated bed type, an unknown bed type and a bad quantity", () => {
        const duplicated = [
            { bedType: "KING", quantity: 1 },
            { bedType: "KING", quantity: 2 },
        ];

        expect(parseCreate({ beds: duplicated }).success).toBe(false);
        expect(
            parseCreate({ beds: [{ bedType: "BUNK", quantity: 1 }] }).success,
        ).toBe(false);
        expect(
            parseCreate({ beds: [{ bedType: "KING", quantity: 0 }] }).success,
        ).toBe(false);
    });

    it("requires a name and a description", () => {
        expect(parseCreate({ name: " " }).success).toBe(false);
        expect(parseCreate({ description: " " }).success).toBe(false);
    });
});

describe("updateRoomTypeSchema", () => {
    it("requires at least one field", () => {
        expect(updateRoomTypeSchema.safeParse({}).success).toBe(false);
    });

    it("accepts a partial change and normalizes the price", () => {
        const result = updateRoomTypeSchema.safeParse({ defaultPrice: 99.9 });

        expect(result.data).toEqual({ defaultPrice: "99.90" });
    });

    it("accepts only isActive false (the deactivation is definitive)", () => {
        expect(
            updateRoomTypeSchema.safeParse({ isActive: false }).success,
        ).toBe(true);
        expect(updateRoomTypeSchema.safeParse({ isActive: true }).success).toBe(
            false,
        );
    });
});

describe("roomTypeParamsSchema", () => {
    it("requires a UUID", () => {
        expect(roomTypeParamsSchema.safeParse({ id: UUID }).success).toBe(true);
        expect(roomTypeParamsSchema.safeParse({ id: "1" }).success).toBe(false);
    });
});
