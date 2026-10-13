import { describe, expect, it, vi } from "vitest";
import { HOTEL_STATUSES } from "../../src/constants/hotel-statuses.js";
import { ERROR_CODES } from "../../src/lib/errors.js";
import {
    ROOM_DELETE_OUTCOMES,
    createRoomService,
} from "../../src/services/room-service.js";

const HOTEL_ID = "3f1c2a4e-8b7d-4c6a-9e21-5d0b7a1c9f33";
const OTHER_HOTEL_ID = "9e21c6a4-8b7d-4c6a-9e21-5d0b7a1c0001";
const UNIT_ID = "7a1c9f33-8b7d-4c6a-9e21-3f1c2a4e5d0b";
const ROOM_ID = "c1c9f33a-8b7d-4c6a-9e21-3f1c2a4e0002";
const TYPE_ID = "a1b2c3d4-8b7d-4c6a-9e21-3f1c2a4e0003";
const OTHER_TYPE_ID = "a1b2c3d4-8b7d-4c6a-9e21-3f1c2a4e0004";
const TRANSACTION_CLIENT = Object.freeze({ id: "transaction-client" });
const NOW = new Date("2026-10-13T12:00:00.000Z");

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const ADDITIONAL_MANAGER = Object.freeze({ id: "manager-3", role: "MANAGER" });
const OTHER_MANAGER = Object.freeze({ id: "manager-2", role: "MANAGER" });
const ADMIN = Object.freeze({ id: "admin-1", role: "ADMIN" });

function buildRoom(overrides = {}) {
    return {
        id: ROOM_ID,
        unitId: UNIT_ID,
        roomTypeId: TYPE_ID,
        number: "101",
        floor: 1,
        status: "AVAILABLE",
        isAccessible: false,
        administrativeNotes: null,
        isActive: true,
        roomType: { id: TYPE_ID, name: "Suíte", defaultPrice: "350.00" },
        priceHistory: [],
        ...overrides,
    };
}

function createWorld({
    hotelStatus = HOTEL_STATUSES.DRAFT,
    unitIsActive = true,
    room = buildRoom(),
    hasHistory = false,
    roomTypes = {
        [TYPE_ID]: { id: TYPE_ID, hotelId: HOTEL_ID, isActive: true },
        [OTHER_TYPE_ID]: {
            id: OTHER_TYPE_ID,
            hotelId: OTHER_HOTEL_ID,
            isActive: true,
        },
    },
} = {}) {
    const hotel = {
        ownerUserId: MANAGER.id,
        status: hotelStatus,
        managers: [{ userId: ADDITIONAL_MANAGER.id }],
    };
    const unit = {
        id: UNIT_ID,
        hotelId: HOTEL_ID,
        isActive: unitIsActive,
        hotel,
    };

    const roomRepository = {
        create: vi.fn(async (data) => buildRoom({ ...data, priceHistory: [] })),
        findByIdWithAccess: vi.fn(async (id) =>
            room?.id === id
                ? {
                      ...room,
                      unit: { hotelId: HOTEL_ID, isActive: true, hotel },
                  }
                : null,
        ),
        listByUnit: vi.fn(async () => [room]),
        updateFields: vi.fn(async () => {}),
        changeRoomType: vi.fn(async () => {}),
        changePrice: vi.fn(async () => {}),
        hasHistory: vi.fn(async () => hasHistory),
        deleteById: vi.fn(async () => {}),
    };
    const roomTypeRepository = {
        findById: vi.fn(async (id) => roomTypes[id] ?? null),
    };
    const unitRepository = {
        findByIdWithHotel: vi.fn(async (id) => (id === UNIT_ID ? unit : null)),
    };
    const transactionRunner = {
        run: vi.fn(async (work) => work(TRANSACTION_CLIENT)),
    };
    const service = createRoomService({
        roomRepository,
        roomTypeRepository,
        unitRepository,
        transactionRunner,
        clock: () => NOW,
    });
    return {
        service,
        roomRepository,
        roomTypeRepository,
        unitRepository,
        transactionRunner,
    };
}

const CREATE_INPUT = Object.freeze({
    roomTypeId: TYPE_ID,
    number: "101",
    floor: 1,
    isAccessible: false,
    status: "AVAILABLE",
});

describe("roomService.createRoom", () => {
    it("creates the room with its first type history row in one transaction (RN007, RN009)", async () => {
        const { service, roomRepository, transactionRunner } = createWorld();

        const room = await service.createRoom(MANAGER, UNIT_ID, CREATE_INPUT);

        expect(transactionRunner.run).toHaveBeenCalledOnce();
        expect(roomRepository.create).toHaveBeenCalledWith(
            { unitId: UNIT_ID, ...CREATE_INPUT, validFrom: NOW },
            TRANSACTION_CLIENT,
        );
        expect(room.number).toBe("101");
    });

    it("passes the room price so that it becomes the first price history row (RN010)", async () => {
        const { service, roomRepository } = createWorld();

        await service.createRoom(MANAGER, UNIT_ID, {
            ...CREATE_INPUT,
            price: "299.90",
        });

        expect(roomRepository.create.mock.calls[0][0]).toMatchObject({
            price: "299.90",
            validFrom: NOW,
        });
    });

    it("lets an additional manager create rooms", async () => {
        const { service } = createWorld();

        await expect(
            service.createRoom(ADDITIONAL_MANAGER, UNIT_ID, CREATE_INPUT),
        ).resolves.toBeDefined();
    });

    it("hides the unit from a manager outside the hotel with 404 UNIT_NOT_FOUND", async () => {
        const { service } = createWorld();

        await expect(
            service.createRoom(OTHER_MANAGER, UNIT_ID, CREATE_INPUT),
        ).rejects.toMatchObject({ code: ERROR_CODES.UNIT_NOT_FOUND });
    });

    it("answers 404 UNIT_NOT_FOUND for an unknown unit", async () => {
        const { service } = createWorld();

        await expect(
            service.createRoom(MANAGER, ROOM_ID, CREATE_INPUT),
        ).rejects.toMatchObject({ code: ERROR_CODES.UNIT_NOT_FOUND });
    });

    it("refuses a room type of another hotel with 404 ROOM_TYPE_NOT_FOUND (RN009)", async () => {
        const { service, roomRepository } = createWorld();

        await expect(
            service.createRoom(MANAGER, UNIT_ID, {
                ...CREATE_INPUT,
                roomTypeId: OTHER_TYPE_ID,
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.ROOM_TYPE_NOT_FOUND });
        expect(roomRepository.create).not.toHaveBeenCalled();
    });

    it("refuses an unknown or inactive room type", async () => {
        const { service } = createWorld({
            roomTypes: {
                [TYPE_ID]: { id: TYPE_ID, hotelId: HOTEL_ID, isActive: false },
            },
        });

        await expect(
            service.createRoom(MANAGER, UNIT_ID, CREATE_INPUT),
        ).rejects.toMatchObject({ code: ERROR_CODES.ROOM_TYPE_NOT_FOUND });
        await expect(
            service.createRoom(MANAGER, UNIT_ID, {
                ...CREATE_INPUT,
                roomTypeId: ROOM_ID,
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.ROOM_TYPE_NOT_FOUND });
    });

    it("answers 409 INVALID_HOTEL_STATUS unless the hotel is DRAFT (RN120)", async () => {
        for (const status of [
            HOTEL_STATUSES.UNDER_REVIEW,
            HOTEL_STATUSES.PUBLISHED,
            HOTEL_STATUSES.BLOCKED,
        ]) {
            const { service } = createWorld({ hotelStatus: status });

            await expect(
                service.createRoom(MANAGER, UNIT_ID, CREATE_INPUT),
            ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_HOTEL_STATUS });
        }
    });

    it("refuses a room in a deactivated unit", async () => {
        const { service } = createWorld({ unitIsActive: false });

        await expect(
            service.createRoom(MANAGER, UNIT_ID, CREATE_INPUT),
        ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_ERROR });
    });

    it("answers 409 ROOM_NUMBER_ALREADY_EXISTS when the unit already has the number (RN008)", async () => {
        const { service, roomRepository } = createWorld();
        roomRepository.create.mockRejectedValue(
            Object.assign(new Error("duplicate"), { code: "P2002" }),
        );

        await expect(
            service.createRoom(MANAGER, UNIT_ID, CREATE_INPUT),
        ).rejects.toMatchObject({
            code: ERROR_CODES.ROOM_NUMBER_ALREADY_EXISTS,
        });
    });

    it("does not hide other database errors", async () => {
        const { service, roomRepository } = createWorld();
        roomRepository.create.mockRejectedValue(new Error("boom"));

        await expect(
            service.createRoom(MANAGER, UNIT_ID, CREATE_INPUT),
        ).rejects.toThrow("boom");
    });
});

describe("roomService reads", () => {
    it("shows the room price, the type price and the effective price", async () => {
        const { service } = createWorld({
            room: buildRoom({
                priceHistory: [{ price: "299.9", validFrom: NOW }],
            }),
        });

        const room = await service.getRoom(MANAGER, ROOM_ID);

        expect(room).toMatchObject({
            price: "299.90",
            effectivePrice: "299.90",
            roomType: { defaultPrice: "350.00" },
        });
        expect(room).not.toHaveProperty("priceHistory");
        expect(room).not.toHaveProperty("unit");
    });

    it("falls back to the room type price when the room has no price (RN010, doc 25 §10)", async () => {
        const { service } = createWorld();

        const room = await service.getRoom(MANAGER, ROOM_ID);

        expect(room).toMatchObject({ price: null, effectivePrice: "350.00" });
    });

    it("lets the admin read and lists the rooms of the unit", async () => {
        const { service } = createWorld();

        await expect(service.getRoom(ADMIN, ROOM_ID)).resolves.toBeDefined();
        await expect(service.listRooms(ADMIN, UNIT_ID)).resolves.toHaveLength(
            1,
        );
    });

    it("answers 404 for a manager outside the hotel", async () => {
        const { service } = createWorld();

        await expect(
            service.getRoom(OTHER_MANAGER, ROOM_ID),
        ).rejects.toMatchObject({ code: ERROR_CODES.ROOM_NOT_FOUND });
        await expect(
            service.listRooms(OTHER_MANAGER, UNIT_ID),
        ).rejects.toMatchObject({ code: ERROR_CODES.UNIT_NOT_FOUND });
    });
});

describe("roomService.updateRoom", () => {
    it("closes the open price and opens a new one when the price changes (RN010)", async () => {
        const { service, roomRepository } = createWorld({
            room: buildRoom({
                priceHistory: [{ price: "299.90", validFrom: NOW }],
            }),
        });

        await service.updateRoom(MANAGER, ROOM_ID, { price: "320.00" });

        expect(roomRepository.changePrice).toHaveBeenCalledWith(
            ROOM_ID,
            "320.00",
            NOW,
            TRANSACTION_CLIENT,
        );
    });

    it("does not write history when the price is the same", async () => {
        const { service, roomRepository } = createWorld({
            room: buildRoom({
                priceHistory: [{ price: "299.9", validFrom: NOW }],
            }),
        });

        await service.updateRoom(MANAGER, ROOM_ID, { price: "299.90" });

        expect(roomRepository.changePrice).not.toHaveBeenCalled();
    });

    it("removes the room price with null, so the type price applies again", async () => {
        const { service, roomRepository } = createWorld({
            room: buildRoom({
                priceHistory: [{ price: "299.90", validFrom: NOW }],
            }),
        });

        await service.updateRoom(MANAGER, ROOM_ID, { price: null });

        expect(roomRepository.changePrice).toHaveBeenCalledWith(
            ROOM_ID,
            null,
            NOW,
            TRANSACTION_CLIENT,
        );
    });

    it("does nothing to the history when there was no price and null is sent", async () => {
        const { service, roomRepository } = createWorld();

        await service.updateRoom(MANAGER, ROOM_ID, { price: null });

        expect(roomRepository.changePrice).not.toHaveBeenCalled();
    });

    it("sets a first price on a room without one", async () => {
        const { service, roomRepository } = createWorld();

        await service.updateRoom(MANAGER, ROOM_ID, { price: "100.00" });

        expect(roomRepository.changePrice).toHaveBeenCalledOnce();
    });

    it("writes a type history row when the room type changes (RN009)", async () => {
        const { service, roomRepository } = createWorld({
            roomTypes: {
                [TYPE_ID]: { id: TYPE_ID, hotelId: HOTEL_ID, isActive: true },
                [OTHER_TYPE_ID]: {
                    id: OTHER_TYPE_ID,
                    hotelId: HOTEL_ID,
                    isActive: true,
                },
            },
        });

        await service.updateRoom(MANAGER, ROOM_ID, {
            roomTypeId: OTHER_TYPE_ID,
        });

        expect(roomRepository.changeRoomType).toHaveBeenCalledWith(
            ROOM_ID,
            OTHER_TYPE_ID,
            NOW,
            TRANSACTION_CLIENT,
        );
    });

    it("does not write a type history row when the type is the same", async () => {
        const { service, roomRepository } = createWorld();

        await service.updateRoom(MANAGER, ROOM_ID, { roomTypeId: TYPE_ID });

        expect(roomRepository.changeRoomType).not.toHaveBeenCalled();
    });

    it("refuses to move the room to a type of another hotel", async () => {
        const { service, roomRepository } = createWorld();

        await expect(
            service.updateRoom(MANAGER, ROOM_ID, {
                roomTypeId: OTHER_TYPE_ID,
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.ROOM_TYPE_NOT_FOUND });
        expect(roomRepository.updateFields).not.toHaveBeenCalled();
    });

    it("updates the status and the notes with updatedAt", async () => {
        const { service, roomRepository } = createWorld();

        await service.updateRoom(MANAGER, ROOM_ID, {
            status: "MAINTENANCE",
            administrativeNotes: "Pintura.",
        });

        expect(roomRepository.updateFields).toHaveBeenCalledWith(
            ROOM_ID,
            {
                status: "MAINTENANCE",
                administrativeNotes: "Pintura.",
                updatedAt: NOW,
            },
            TRANSACTION_CLIENT,
        );
    });

    it("deactivates with status INACTIVE and is_active false together", async () => {
        const { service, roomRepository } = createWorld();

        await service.updateRoom(MANAGER, ROOM_ID, { isActive: false });

        expect(roomRepository.updateFields).toHaveBeenCalledWith(
            ROOM_ID,
            { isActive: false, status: "INACTIVE", updatedAt: NOW },
            TRANSACTION_CLIENT,
        );
    });

    it("refuses to edit a deactivated room with 409 ROOM_INACTIVE", async () => {
        const { service } = createWorld({
            room: buildRoom({ isActive: false, status: "INACTIVE" }),
        });

        await expect(
            service.updateRoom(MANAGER, ROOM_ID, { status: "AVAILABLE" }),
        ).rejects.toMatchObject({ code: ERROR_CODES.ROOM_INACTIVE });
    });

    it("answers 409 ROOM_NUMBER_ALREADY_EXISTS when renumbering to a used number (RN008)", async () => {
        const { service, roomRepository } = createWorld();
        roomRepository.updateFields.mockRejectedValue(
            Object.assign(new Error("duplicate"), { code: "P2002" }),
        );

        await expect(
            service.updateRoom(MANAGER, ROOM_ID, { number: "102" }),
        ).rejects.toMatchObject({
            code: ERROR_CODES.ROOM_NUMBER_ALREADY_EXISTS,
        });
    });

    it("lets operational changes through in a PUBLISHED hotel", async () => {
        const { service } = createWorld({
            hotelStatus: HOTEL_STATUSES.PUBLISHED,
        });

        await expect(
            service.updateRoom(MANAGER, ROOM_ID, {
                status: "UNAVAILABLE",
                price: "100.00",
                administrativeNotes: null,
            }),
        ).resolves.toBeDefined();
    });

    it("refuses structural changes unless the hotel is DRAFT", async () => {
        const { service, roomRepository } = createWorld({
            hotelStatus: HOTEL_STATUSES.PUBLISHED,
        });

        for (const changes of [
            { number: "102" },
            { floor: 2 },
            { isAccessible: true },
            { roomTypeId: TYPE_ID },
            { number: "102", status: "AVAILABLE" },
        ]) {
            await expect(
                service.updateRoom(MANAGER, ROOM_ID, changes),
            ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_HOTEL_STATUS });
        }
        expect(roomRepository.updateFields).not.toHaveBeenCalled();
    });

    it("refuses every change while the hotel is UNDER_REVIEW or BLOCKED", async () => {
        for (const status of [
            HOTEL_STATUSES.UNDER_REVIEW,
            HOTEL_STATUSES.BLOCKED,
        ]) {
            const { service } = createWorld({ hotelStatus: status });

            await expect(
                service.updateRoom(MANAGER, ROOM_ID, { status: "AVAILABLE" }),
            ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_HOTEL_STATUS });
        }
    });

    it("answers 404 ROOM_NOT_FOUND for a manager outside the hotel", async () => {
        const { service } = createWorld();

        await expect(
            service.updateRoom(OTHER_MANAGER, ROOM_ID, { floor: 2 }),
        ).rejects.toMatchObject({ code: ERROR_CODES.ROOM_NOT_FOUND });
    });
});

describe("roomService.deleteRoom (RN011)", () => {
    it("deletes physically a room with no history", async () => {
        const { service, roomRepository } = createWorld({ hasHistory: false });

        const result = await service.deleteRoom(MANAGER, ROOM_ID);

        expect(result).toEqual({
            id: ROOM_ID,
            outcome: ROOM_DELETE_OUTCOMES.DELETED,
        });
        expect(roomRepository.deleteById).toHaveBeenCalledWith(
            ROOM_ID,
            TRANSACTION_CLIENT,
        );
        expect(roomRepository.updateFields).not.toHaveBeenCalled();
    });

    it("deactivates a room with history and never deletes it", async () => {
        const { service, roomRepository } = createWorld({ hasHistory: true });

        const result = await service.deleteRoom(MANAGER, ROOM_ID);

        expect(result.outcome).toBe(ROOM_DELETE_OUTCOMES.DEACTIVATED);
        expect(roomRepository.deleteById).not.toHaveBeenCalled();
        expect(roomRepository.updateFields).toHaveBeenCalledWith(
            ROOM_ID,
            { isActive: false, status: "INACTIVE", updatedAt: NOW },
            TRANSACTION_CLIENT,
        );
    });

    it("is idempotent for a room that is already deactivated", async () => {
        const { service, roomRepository } = createWorld({
            hasHistory: true,
            room: buildRoom({ isActive: false, status: "INACTIVE" }),
        });

        const result = await service.deleteRoom(MANAGER, ROOM_ID);

        expect(result.outcome).toBe(ROOM_DELETE_OUTCOMES.DEACTIVATED);
        expect(roomRepository.updateFields).not.toHaveBeenCalled();
    });

    it("works in a PUBLISHED hotel but not UNDER_REVIEW or BLOCKED", async () => {
        const published = createWorld({
            hotelStatus: HOTEL_STATUSES.PUBLISHED,
        });

        await expect(
            published.service.deleteRoom(MANAGER, ROOM_ID),
        ).resolves.toBeDefined();
        for (const status of [
            HOTEL_STATUSES.UNDER_REVIEW,
            HOTEL_STATUSES.BLOCKED,
        ]) {
            const { service } = createWorld({ hotelStatus: status });

            await expect(
                service.deleteRoom(MANAGER, ROOM_ID),
            ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_HOTEL_STATUS });
        }
    });

    it("answers 404 ROOM_NOT_FOUND for a manager outside the hotel", async () => {
        const { service, roomRepository } = createWorld();

        await expect(
            service.deleteRoom(OTHER_MANAGER, ROOM_ID),
        ).rejects.toMatchObject({ code: ERROR_CODES.ROOM_NOT_FOUND });
        expect(roomRepository.deleteById).not.toHaveBeenCalled();
    });
});
