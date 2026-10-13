import { describe, expect, it, vi } from "vitest";
import { HOTEL_STATUSES } from "../../src/constants/hotel-statuses.js";
import { ERROR_CODES } from "../../src/lib/errors.js";
import {
    ROOM_TYPE_DELETE_OUTCOMES,
    createRoomTypeService,
} from "../../src/services/room-type-service.js";

const HOTEL_ID = "3f1c2a4e-8b7d-4c6a-9e21-5d0b7a1c9f33";
const TYPE_ID = "a1b2c3d4-8b7d-4c6a-9e21-3f1c2a4e0003";
const TRANSACTION_CLIENT = Object.freeze({ id: "transaction-client" });

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const ADDITIONAL_MANAGER = Object.freeze({ id: "manager-3", role: "MANAGER" });
const OTHER_MANAGER = Object.freeze({ id: "manager-2", role: "MANAGER" });
const ADMIN = Object.freeze({ id: "admin-1", role: "ADMIN" });

const INPUT = Object.freeze({
    name: "Suíte Master",
    description: "Suíte com vista para o mar.",
    maxGuests: 3,
    areaM2: "42.50",
    defaultPrice: "350.00",
    beds: [{ bedType: "KING", quantity: 1 }],
});

function buildStoredType(overrides = {}) {
    return {
        id: TYPE_ID,
        hotelId: HOTEL_ID,
        ...INPUT,
        areaM2: "42.5",
        defaultPrice: "350",
        isActive: true,
        ...overrides,
    };
}

function createWorld({
    hotelStatus = HOTEL_STATUSES.DRAFT,
    storedType = buildStoredType(),
    hasRoomReferences = false,
} = {}) {
    const hotel = {
        id: HOTEL_ID,
        ownerUserId: MANAGER.id,
        status: hotelStatus,
        managers: [{ userId: ADDITIONAL_MANAGER.id }],
    };
    const hotelRepository = {
        findById: vi.fn(async (id) => (id === HOTEL_ID ? { ...hotel } : null)),
    };
    const roomTypeRepository = {
        create: vi.fn(async (data) => buildStoredType(data)),
        findByIdWithHotel: vi.fn(async (id) =>
            id === TYPE_ID ? { ...storedType, hotel: { ...hotel } } : null,
        ),
        listByHotel: vi.fn(async () => [storedType]),
        updateFields: vi.fn(async () => {}),
        replaceBeds: vi.fn(async () => {}),
        hasRoomReferences: vi.fn(async () => hasRoomReferences),
        deleteById: vi.fn(async () => {}),
    };
    const transactionRunner = {
        run: vi.fn(async (work) => work(TRANSACTION_CLIENT)),
    };
    const service = createRoomTypeService({
        roomTypeRepository,
        hotelRepository,
        transactionRunner,
    });
    return { service, roomTypeRepository, hotelRepository, transactionRunner };
}

describe("roomTypeService.createRoomType", () => {
    it("creates the type of the hotel with its beds in one transaction (RN009)", async () => {
        const { service, roomTypeRepository, transactionRunner } =
            createWorld();

        const roomType = await service.createRoomType(MANAGER, HOTEL_ID, INPUT);

        expect(transactionRunner.run).toHaveBeenCalledOnce();
        expect(roomTypeRepository.create).toHaveBeenCalledWith(
            { hotelId: HOTEL_ID, ...INPUT },
            TRANSACTION_CLIENT,
        );
        expect(roomType).toMatchObject({
            areaM2: "42.50",
            defaultPrice: "350.00",
        });
    });

    it("lets an additional manager create types", async () => {
        const { service } = createWorld();

        await expect(
            service.createRoomType(ADDITIONAL_MANAGER, HOTEL_ID, INPUT),
        ).resolves.toBeDefined();
    });

    it("answers 404 HOTEL_NOT_FOUND for a manager outside the hotel", async () => {
        const { service } = createWorld();

        await expect(
            service.createRoomType(OTHER_MANAGER, HOTEL_ID, INPUT),
        ).rejects.toMatchObject({ code: ERROR_CODES.HOTEL_NOT_FOUND });
    });

    it("answers 409 INVALID_HOTEL_STATUS unless the hotel is DRAFT (RN120)", async () => {
        for (const status of [
            HOTEL_STATUSES.UNDER_REVIEW,
            HOTEL_STATUSES.PUBLISHED,
            HOTEL_STATUSES.BLOCKED,
        ]) {
            const { service, roomTypeRepository } = createWorld({
                hotelStatus: status,
            });

            await expect(
                service.createRoomType(MANAGER, HOTEL_ID, INPUT),
            ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_HOTEL_STATUS });
            expect(roomTypeRepository.create).not.toHaveBeenCalled();
        }
    });
});

describe("roomTypeService reads", () => {
    it("formats money and area with 2 places and hides the hotel", async () => {
        const { service } = createWorld();

        const roomType = await service.getRoomType(MANAGER, TYPE_ID);

        expect(roomType).toMatchObject({
            areaM2: "42.50",
            defaultPrice: "350.00",
        });
        expect(roomType).not.toHaveProperty("hotel");
    });

    it("lets the admin read and list", async () => {
        const { service } = createWorld();

        await expect(
            service.getRoomType(ADMIN, TYPE_ID),
        ).resolves.toBeDefined();
        await expect(
            service.listRoomTypes(ADMIN, HOTEL_ID),
        ).resolves.toHaveLength(1);
    });

    it("answers 404 for a manager outside the hotel", async () => {
        const { service } = createWorld();

        await expect(
            service.getRoomType(OTHER_MANAGER, TYPE_ID),
        ).rejects.toMatchObject({ code: ERROR_CODES.ROOM_TYPE_NOT_FOUND });
        await expect(
            service.listRoomTypes(OTHER_MANAGER, HOTEL_ID),
        ).rejects.toMatchObject({ code: ERROR_CODES.HOTEL_NOT_FOUND });
    });
});

describe("roomTypeService.updateRoomType", () => {
    it("updates the fields with updatedAt and replaces the beds", async () => {
        const { service, roomTypeRepository } = createWorld();
        const beds = [{ bedType: "QUEEN", quantity: 2 }];

        await service.updateRoomType(MANAGER, TYPE_ID, {
            name: "Suíte Luxo",
            beds,
        });

        expect(roomTypeRepository.updateFields).toHaveBeenCalledWith(
            TYPE_ID,
            { name: "Suíte Luxo", updatedAt: expect.any(Date) },
            TRANSACTION_CLIENT,
        );
        expect(roomTypeRepository.replaceBeds).toHaveBeenCalledWith(
            TYPE_ID,
            beds,
            TRANSACTION_CLIENT,
        );
    });

    it("does not touch the beds when they are not sent", async () => {
        const { service, roomTypeRepository } = createWorld();

        await service.updateRoomType(MANAGER, TYPE_ID, { name: "Outro" });

        expect(roomTypeRepository.replaceBeds).not.toHaveBeenCalled();
    });

    it("lets a price-only change through in a PUBLISHED hotel", async () => {
        const { service } = createWorld({
            hotelStatus: HOTEL_STATUSES.PUBLISHED,
        });

        await expect(
            service.updateRoomType(MANAGER, TYPE_ID, {
                defaultPrice: "400.00",
            }),
        ).resolves.toBeDefined();
    });

    it("refuses any other change in a PUBLISHED hotel", async () => {
        const { service } = createWorld({
            hotelStatus: HOTEL_STATUSES.PUBLISHED,
        });

        for (const changes of [
            { name: "Outro" },
            { maxGuests: 4 },
            { beds: [{ bedType: "KING", quantity: 1 }] },
            { defaultPrice: "400.00", name: "Outro" },
            { isActive: false },
        ]) {
            await expect(
                service.updateRoomType(MANAGER, TYPE_ID, changes),
            ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_HOTEL_STATUS });
        }
    });

    it("refuses a price change while the hotel is UNDER_REVIEW or BLOCKED", async () => {
        for (const status of [
            HOTEL_STATUSES.UNDER_REVIEW,
            HOTEL_STATUSES.BLOCKED,
        ]) {
            const { service } = createWorld({ hotelStatus: status });

            await expect(
                service.updateRoomType(MANAGER, TYPE_ID, {
                    defaultPrice: "400.00",
                }),
            ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_HOTEL_STATUS });
        }
    });

    it("refuses to edit a deactivated type with 409 ROOM_TYPE_INACTIVE", async () => {
        const { service } = createWorld({
            storedType: buildStoredType({ isActive: false }),
        });

        await expect(
            service.updateRoomType(MANAGER, TYPE_ID, { name: "Outro" }),
        ).rejects.toMatchObject({ code: ERROR_CODES.ROOM_TYPE_INACTIVE });
    });

    it("answers 404 ROOM_TYPE_NOT_FOUND for a manager outside the hotel", async () => {
        const { service } = createWorld();

        await expect(
            service.updateRoomType(OTHER_MANAGER, TYPE_ID, { name: "Outro" }),
        ).rejects.toMatchObject({ code: ERROR_CODES.ROOM_TYPE_NOT_FOUND });
    });
});

describe("roomTypeService.deleteRoomType (RN011)", () => {
    it("deletes physically a type that no room ever used", async () => {
        const { service, roomTypeRepository } = createWorld();

        const result = await service.deleteRoomType(MANAGER, TYPE_ID);

        expect(result).toEqual({
            id: TYPE_ID,
            outcome: ROOM_TYPE_DELETE_OUTCOMES.DELETED,
        });
        expect(roomTypeRepository.deleteById).toHaveBeenCalledWith(
            TYPE_ID,
            TRANSACTION_CLIENT,
        );
    });

    it("deactivates a type that rooms or history reference", async () => {
        const { service, roomTypeRepository } = createWorld({
            hasRoomReferences: true,
        });

        const result = await service.deleteRoomType(MANAGER, TYPE_ID);

        expect(result.outcome).toBe(ROOM_TYPE_DELETE_OUTCOMES.DEACTIVATED);
        expect(roomTypeRepository.deleteById).not.toHaveBeenCalled();
        expect(roomTypeRepository.updateFields).toHaveBeenCalledWith(
            TYPE_ID,
            { isActive: false, updatedAt: expect.any(Date) },
            TRANSACTION_CLIENT,
        );
    });

    it("is idempotent for a type that is already deactivated", async () => {
        const { service, roomTypeRepository } = createWorld({
            hasRoomReferences: true,
            storedType: buildStoredType({ isActive: false }),
        });

        const result = await service.deleteRoomType(MANAGER, TYPE_ID);

        expect(result.outcome).toBe(ROOM_TYPE_DELETE_OUTCOMES.DEACTIVATED);
        expect(roomTypeRepository.updateFields).not.toHaveBeenCalled();
    });

    it("requires a DRAFT hotel and a manager of the hotel", async () => {
        const published = createWorld({
            hotelStatus: HOTEL_STATUSES.PUBLISHED,
        });
        const regular = createWorld();

        await expect(
            published.service.deleteRoomType(MANAGER, TYPE_ID),
        ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_HOTEL_STATUS });
        await expect(
            regular.service.deleteRoomType(OTHER_MANAGER, TYPE_ID),
        ).rejects.toMatchObject({ code: ERROR_CODES.ROOM_TYPE_NOT_FOUND });
    });
});
