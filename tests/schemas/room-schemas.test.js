import { describe, expect, it } from "vitest";
import {
    createRoomSchema,
    roomParamsSchema,
    updateRoomSchema,
} from "../../src/schemas/room-schemas.js";

const UUID = "3f1c2a4e-8b7d-4c6a-9e21-5d0b7a1c9f33";

const VALID_INPUT = Object.freeze({
    roomTypeId: UUID,
    number: " 101 ",
    floor: 1,
});

function parseCreate(overrides) {
    return createRoomSchema.safeParse({ ...VALID_INPUT, ...overrides });
}

describe("createRoomSchema", () => {
    it("applies the defaults: AVAILABLE, not accessible, no price", () => {
        const result = parseCreate({});

        expect(result.success).toBe(true);
        expect(result.data).toEqual({
            roomTypeId: UUID,
            number: "101",
            floor: 1,
            isAccessible: false,
            status: "AVAILABLE",
        });
    });

    it("normalizes the room price to 2 decimal places (RN010)", () => {
        expect(parseCreate({ price: 299.9 }).data.price).toBe("299.90");
    });

    it.each([0, -5, "10.123", "abc"])("rejects the price %s", (price) => {
        expect(parseCreate({ price }).success).toBe(false);
    });

    it("turns blank administrative notes into null", () => {
        expect(parseCreate({ administrativeNotes: "  " }).data).toMatchObject({
            administrativeNotes: null,
        });
    });

    it("lets the manager choose only AVAILABLE, UNAVAILABLE or MAINTENANCE", () => {
        expect(parseCreate({ status: "MAINTENANCE" }).success).toBe(true);
        expect(parseCreate({ status: "BLOCKED" }).success).toBe(false);
        expect(parseCreate({ status: "INACTIVE" }).success).toBe(false);
    });

    it("rejects a blank or too long number, a bad floor and a bad type id", () => {
        expect(parseCreate({ number: " " }).success).toBe(false);
        expect(parseCreate({ number: "x".repeat(21) }).success).toBe(false);
        expect(parseCreate({ floor: 1.5 }).success).toBe(false);
        expect(parseCreate({ floor: "1" }).success).toBe(false);
        expect(parseCreate({ roomTypeId: "abc" }).success).toBe(false);
    });
});

describe("updateRoomSchema", () => {
    it("requires at least one field", () => {
        expect(updateRoomSchema.safeParse({}).success).toBe(false);
    });

    it("accepts price null to remove the room price (back to the type price)", () => {
        expect(updateRoomSchema.safeParse({ price: null }).data).toEqual({
            price: null,
        });
    });

    it("accepts only isActive false and not together with a status", () => {
        expect(updateRoomSchema.safeParse({ isActive: false }).success).toBe(
            true,
        );
        expect(updateRoomSchema.safeParse({ isActive: true }).success).toBe(
            false,
        );
        expect(
            updateRoomSchema.safeParse({
                isActive: false,
                status: "MAINTENANCE",
            }).success,
        ).toBe(false);
    });
});

describe("roomParamsSchema", () => {
    it("requires a UUID", () => {
        expect(roomParamsSchema.safeParse({ id: UUID }).success).toBe(true);
        expect(roomParamsSchema.safeParse({ id: "1" }).success).toBe(false);
    });
});
