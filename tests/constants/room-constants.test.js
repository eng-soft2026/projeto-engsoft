import { describe, expect, it } from "vitest";
import { BED_TYPES } from "../../src/constants/bed-types.js";
import {
    MANUAL_ROOM_STATUSES,
    ROOM_STATUSES,
} from "../../src/constants/room-statuses.js";
import { readPrismaEnumValues } from "../helpers/prisma-schema.js";

describe("BED_TYPES", () => {
    it("lists the five bed types of doc 25 §8 and matches the Prisma enum", () => {
        expect(Object.values(BED_TYPES).sort()).toEqual(
            ["DOUBLE", "KING", "QUEEN", "SINGLE", "SOFA_BED"].sort(),
        );
        expect(Object.values(BED_TYPES).sort()).toEqual(
            readPrismaEnumValues("BedType").sort(),
        );
    });
});

describe("ROOM_STATUSES", () => {
    it("lists the five statuses of doc 25 §9 and matches the Prisma enum", () => {
        expect(Object.values(ROOM_STATUSES).sort()).toEqual(
            [
                "AVAILABLE",
                "BLOCKED",
                "INACTIVE",
                "MAINTENANCE",
                "UNAVAILABLE",
            ].sort(),
        );
        expect(Object.values(ROOM_STATUSES).sort()).toEqual(
            readPrismaEnumValues("RoomStatus").sort(),
        );
    });

    it("leaves BLOCKED and INACTIVE out of the manual statuses", () => {
        expect(MANUAL_ROOM_STATUSES).toEqual([
            "AVAILABLE",
            "UNAVAILABLE",
            "MAINTENANCE",
        ]);
        expect(Object.isFrozen(MANUAL_ROOM_STATUSES)).toBe(true);
    });
});
