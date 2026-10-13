import { describe, expect, it } from "vitest";
import { HOTEL_STATUSES } from "../../src/constants/hotel-statuses.js";
import { readPrismaEnumValues } from "../helpers/prisma-schema.js";

describe("HOTEL_STATUSES", () => {
    it("lists the four hotel states of RN003", () => {
        expect(Object.values(HOTEL_STATUSES).sort()).toEqual([
            "BLOCKED",
            "DRAFT",
            "PUBLISHED",
            "UNDER_REVIEW",
        ]);
    });

    it("matches the HotelStatus enum in the Prisma schema (doc 25 §4)", () => {
        expect(Object.values(HOTEL_STATUSES).sort()).toEqual(
            readPrismaEnumValues("HotelStatus").sort(),
        );
    });

    it("is frozen", () => {
        expect(Object.isFrozen(HOTEL_STATUSES)).toBe(true);
    });
});
