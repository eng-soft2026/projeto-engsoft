import { describe, expect, it } from "vitest";
import {
    createAmenitySchema,
    replaceAmenitiesSchema,
} from "../../src/schemas/amenity-schemas.js";

const UUID = "3f1c2a4e-8b7d-4c6a-9e21-5d0b7a1c9f33";
const OTHER_UUID = "a1b2c3d4-8b7d-4c6a-9e21-3f1c2a4e0003";

describe("createAmenitySchema", () => {
    it("trims the name", () => {
        const result = createAmenitySchema.safeParse({ name: "  Piscina " });

        expect(result.data).toEqual({ name: "Piscina" });
    });

    it.each([{ name: "A" }, { name: "x".repeat(101) }, {}, null])(
        "rejects %j",
        (input) => {
            expect(createAmenitySchema.safeParse(input).success).toBe(false);
        },
    );
});

describe("replaceAmenitiesSchema", () => {
    it("removes repeated ids so a pair is never duplicated", () => {
        const result = replaceAmenitiesSchema.safeParse({
            amenityIds: [UUID, OTHER_UUID, UUID],
        });

        expect(result.data).toEqual({ amenityIds: [UUID, OTHER_UUID] });
    });

    it("accepts an empty list to clear the amenities", () => {
        expect(
            replaceAmenitiesSchema.safeParse({ amenityIds: [] }).success,
        ).toBe(true);
    });

    it.each([
        { amenityIds: ["not-a-uuid"] },
        { amenityIds: "x" },
        { amenityIds: Array.from({ length: 101 }, () => UUID) },
        {},
    ])("rejects %j", (input) => {
        expect(replaceAmenitiesSchema.safeParse(input).success).toBe(false);
    });
});
