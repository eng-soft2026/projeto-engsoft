import { describe, expect, it } from "vitest";
import { ROOM_STATUSES } from "../../../src/constants/room-statuses.js";
import {
    ROOM_FORM_DEFAULT_VALUES,
    buildRoomTypeOptions,
    roomFormSchema,
    roomOperationFormSchema,
    toCreateRoomPayload,
    toRoomFormValues,
    toRoomOperationPayload,
    toUpdateRoomPayload,
} from "../../../src/modules/rooms/room-form.js";

const VALID_VALUES = Object.freeze({
    ...ROOM_FORM_DEFAULT_VALUES,
    roomTypeId: "type-1",
    number: "101",
    floor: 1,
});

const ROOM = Object.freeze({
    id: "room-1",
    roomTypeId: "type-1",
    number: "101",
    floor: 1,
    isAccessible: true,
    administrativeNotes: null,
    status: ROOM_STATUSES.MAINTENANCE,
    price: "420.50",
});

function readIssuePaths(result) {
    return result.error.issues.map(({ path }) => path.join("."));
}

describe("roomFormSchema", () => {
    it("accepts a room that uses the type price without a price", () => {
        expect(roomFormSchema.safeParse(VALID_VALUES).success).toBe(true);
    });

    it("requires a valid own price when not using the type price", () => {
        const result = roomFormSchema.safeParse({
            ...VALID_VALUES,
            usesTypePrice: false,
            price: "abc",
        });

        expect(result.success).toBe(false);
        expect(readIssuePaths(result)).toEqual(["price"]);
    });

    it("rejects missing type, empty number and floor out of range", () => {
        const result = roomFormSchema.safeParse({
            ...VALID_VALUES,
            roomTypeId: "",
            number: " ",
            floor: 201,
        });

        expect(readIssuePaths(result)).toEqual([
            "roomTypeId",
            "number",
            "floor",
        ]);
    });

    it("operation schema ignores structure fields", () => {
        const result = roomOperationFormSchema.safeParse({
            status: "",
            administrativeNotes: "",
            usesTypePrice: true,
            price: "",
        });

        expect(readIssuePaths(result)).toEqual(["status"]);
    });
});

describe("room form mapping", () => {
    it("loads the room values with the own price in Brazilian format", () => {
        expect(toRoomFormValues(ROOM)).toEqual({
            roomTypeId: "type-1",
            number: "101",
            floor: 1,
            isAccessible: true,
            administrativeNotes: "",
            status: ROOM_STATUSES.MAINTENANCE,
            usesTypePrice: false,
            price: "420,50",
        });
    });

    it("marks the type price and clears a non manual status", () => {
        const values = toRoomFormValues({
            ...ROOM,
            price: null,
            status: ROOM_STATUSES.BLOCKED,
        });

        expect(values.usesTypePrice).toBe(true);
        expect(values.price).toBe("");
        expect(values.status).toBe("");
    });

    it("omits the price on create when using the type price", () => {
        expect(toCreateRoomPayload(VALID_VALUES)).toEqual({
            roomTypeId: "type-1",
            number: "101",
            floor: 1,
            isAccessible: false,
            administrativeNotes: "",
            status: ROOM_STATUSES.AVAILABLE,
        });
    });

    it("sends the own price with 2 decimal places", () => {
        const payload = toCreateRoomPayload({
            ...VALID_VALUES,
            usesTypePrice: false,
            price: "350,5",
        });

        expect(payload.price).toBe("350.50");
    });

    it("sends a null price on update to close the own price", () => {
        const payload = toUpdateRoomPayload(
            { ...toRoomFormValues(ROOM), usesTypePrice: true },
            ROOM.roomTypeId,
        );

        expect(payload.price).toBeNull();
        expect(payload).not.toHaveProperty("roomTypeId");
    });

    it("sends the room type on update only when it changed", () => {
        const payload = toUpdateRoomPayload(
            { ...toRoomFormValues(ROOM), roomTypeId: "type-2" },
            ROOM.roomTypeId,
        );

        expect(payload.roomTypeId).toBe("type-2");
    });

    it("sends only status, notes and price in the operation payload", () => {
        const payload = toRoomOperationPayload({
            ...toRoomFormValues(ROOM),
            usesTypePrice: true,
        });

        expect(payload).toEqual({
            administrativeNotes: "",
            status: ROOM_STATUSES.MAINTENANCE,
            price: null,
        });
    });
});

describe("buildRoomTypeOptions", () => {
    const ROOM_TYPES = Object.freeze([
        { id: "type-1", name: "Standard", isActive: true },
        { id: "type-2", name: "Luxo", isActive: false },
        { id: "type-3", name: "Suíte", isActive: false },
    ]);

    it("lists active types and keeps the current inactive one", () => {
        expect(buildRoomTypeOptions(ROOM_TYPES, "type-2")).toEqual([
            { value: "type-1", label: "Standard" },
            { value: "type-2", label: "Luxo (inativo)" },
        ]);
        expect(buildRoomTypeOptions(ROOM_TYPES)).toEqual([
            { value: "type-1", label: "Standard" },
        ]);
    });
});
