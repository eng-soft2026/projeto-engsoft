import { beforeEach, describe, expect, it } from "vitest";
import { ROOM_STATUSES } from "../../src/constants/room-statuses.js";
import { getPrisma } from "../../src/lib/prisma.js";
import { parseWithSchema } from "../../src/lib/validation.js";
import { updateRoomSchema } from "../../src/schemas/room-schemas.js";
import { hotelService } from "../../src/services/hotel-service.js";
import {
    ROOM_DELETE_OUTCOMES,
    roomService,
} from "../../src/services/room-service.js";
import {
    ROOM_TYPE_DELETE_OUTCOMES,
    roomTypeService,
} from "../../src/services/room-type-service.js";
import { resetDatabase, seedBaseData } from "./helpers/database.js";
import {
    buildRoomInput,
    createAdmin,
    createDraftHotel,
    createHotelWithUnit,
    createManager,
    createRoom,
    createRoomType,
} from "./helpers/fixtures.js";
import { flushRedis } from "./helpers/redis.js";

async function updateRoom(manager, roomId, changes) {
    return roomService.updateRoom(
        manager,
        roomId,
        parseWithSchema(updateRoomSchema, changes),
    );
}

function sortClosedRowsFirst(rows) {
    return [...rows].sort(
        (left, right) =>
            Number(left.validUntil === null) -
            Number(right.validUntil === null),
    );
}

async function listPriceHistory(roomId) {
    const rows = await getPrisma().roomPriceHistory.findMany({
        where: { roomId },
    });
    return sortClosedRowsFirst(rows);
}

async function listTypeHistory(roomId) {
    const rows = await getPrisma().roomTypeHistory.findMany({
        where: { roomId },
    });
    return sortClosedRowsFirst(rows);
}

function findStoredRoom(id) {
    return getPrisma().room.findUnique({ where: { id } });
}

describe("room types and rooms against MySQL", () => {
    let owner;
    let hotel;
    let unit;
    let roomType;

    beforeEach(async () => {
        await resetDatabase();
        await seedBaseData();
        await flushRedis();
        owner = await createManager();
        ({ hotel, unit } = await createHotelWithUnit(owner));
        roomType = await createRoomType(owner, hotel.id);
    });

    it("stores the room type with its beds and Decimal values", async () => {
        const stored = await getPrisma().roomType.findUnique({
            where: { id: roomType.id },
            include: { beds: true },
        });

        expect(roomType).toMatchObject({
            areaM2: "20.50",
            defaultPrice: "250.00",
        });
        expect(stored.defaultPrice.toFixed(2)).toBe("250.00");
        expect(stored.beds).toMatchObject([{ bedType: "DOUBLE", quantity: 1 }]);
    });

    it("opens the type and price history when a room is created", async () => {
        const room = await createRoom(owner, unit.id, roomType.id, {
            price: "300.00",
        });

        expect(room).toMatchObject({
            price: "300.00",
            effectivePrice: "300.00",
        });
        const [priceRow] = await listPriceHistory(room.id);
        expect(priceRow.price.toFixed(2)).toBe("300.00");
        expect(priceRow.validUntil).toBeNull();
        const typeRows = await listTypeHistory(room.id);
        expect(typeRows).toHaveLength(1);
        expect(typeRows[0]).toMatchObject({
            roomTypeId: roomType.id,
            validUntil: null,
        });
    });

    it("closes the open price on a change and falls back to the type price on null", async () => {
        const room = await createRoom(owner, unit.id, roomType.id, {
            price: "300.00",
        });

        const repriced = await updateRoom(owner, room.id, { price: "320.00" });
        expect(repriced.price).toBe("320.00");
        const afterChange = await listPriceHistory(room.id);
        expect(afterChange).toHaveLength(2);
        expect(afterChange[0].validUntil).not.toBeNull();
        expect(afterChange[1]).toMatchObject({ validUntil: null });
        expect(afterChange[1].price.toFixed(2)).toBe("320.00");

        const cleared = await updateRoom(owner, room.id, { price: null });
        expect(cleared).toMatchObject({
            price: null,
            effectivePrice: "250.00",
        });
        const afterClear = await listPriceHistory(room.id);
        expect(afterClear).toHaveLength(2);
        expect(afterClear.every(({ validUntil }) => validUntil !== null)).toBe(
            true,
        );
    });

    it("writes the type history when the room changes type", async () => {
        const suite = await createRoomType(owner, hotel.id, {
            name: "Suíte",
            defaultPrice: "400.00",
        });
        const room = await createRoom(owner, unit.id, roomType.id);

        const updated = await updateRoom(owner, room.id, {
            roomTypeId: suite.id,
        });

        expect(updated.roomType.id).toBe(suite.id);
        expect(updated.effectivePrice).toBe("400.00");
        const typeRows = await listTypeHistory(room.id);
        expect(typeRows.map(({ roomTypeId }) => roomTypeId)).toEqual([
            roomType.id,
            suite.id,
        ]);
        expect(typeRows[0].validUntil).not.toBeNull();
        expect(typeRows[1].validUntil).toBeNull();
    });

    it("deletes a room without history physically", async () => {
        const room = await createRoom(owner, unit.id, roomType.id);

        const result = await roomService.deleteRoom(owner, room.id);

        expect(result).toEqual({
            id: room.id,
            outcome: ROOM_DELETE_OUTCOMES.DELETED,
        });
        await expect(findStoredRoom(room.id)).resolves.toBeNull();
        await expect(listTypeHistory(room.id)).resolves.toHaveLength(0);
    });

    it("deactivates a room with history instead of deleting it", async () => {
        const room = await createRoom(owner, unit.id, roomType.id, {
            price: "300.00",
        });

        const result = await roomService.deleteRoom(owner, room.id);

        expect(result.outcome).toBe(ROOM_DELETE_OUTCOMES.DEACTIVATED);
        const stored = await findStoredRoom(room.id);
        expect(stored).toMatchObject({
            isActive: false,
            status: ROOM_STATUSES.INACTIVE,
        });
        await expect(listPriceHistory(room.id)).resolves.toHaveLength(1);
        await expect(
            updateRoom(owner, room.id, { floor: 2 }),
        ).rejects.toMatchObject({ code: "ROOM_INACTIVE" });
    });

    it("deletes an unused room type and deactivates a used one", async () => {
        const unused = await createRoomType(owner, hotel.id, {
            name: "Econômico",
        });
        await createRoom(owner, unit.id, roomType.id);

        await expect(
            roomTypeService.deleteRoomType(owner, unused.id),
        ).resolves.toEqual({
            id: unused.id,
            outcome: ROOM_TYPE_DELETE_OUTCOMES.DELETED,
        });
        await expect(
            getPrisma().roomType.findUnique({ where: { id: unused.id } }),
        ).resolves.toBeNull();

        await expect(
            roomTypeService.deleteRoomType(owner, roomType.id),
        ).resolves.toEqual({
            id: roomType.id,
            outcome: ROOM_TYPE_DELETE_OUTCOMES.DEACTIVATED,
        });
        const stored = await getPrisma().roomType.findUnique({
            where: { id: roomType.id },
        });
        expect(stored.isActive).toBe(false);
        await expect(
            createRoom(owner, unit.id, roomType.id, { number: "102" }),
        ).rejects.toMatchObject({ code: "ROOM_TYPE_NOT_FOUND" });
    });

    it("translates a duplicate room number into ROOM_NUMBER_ALREADY_EXISTS", async () => {
        await createRoom(owner, unit.id, roomType.id);

        await expect(
            createRoom(owner, unit.id, roomType.id),
        ).rejects.toMatchObject({ code: "ROOM_NUMBER_ALREADY_EXISTS" });
    });

    it("lets only one of two parallel creations with the same number commit", async () => {
        const input = buildRoomInput(roomType.id, { number: "201" });

        const results = await Promise.allSettled([
            roomService.createRoom(owner, unit.id, input),
            roomService.createRoom(owner, unit.id, input),
        ]);

        const rejected = results.filter(({ status }) => status === "rejected");
        expect(rejected).toHaveLength(1);
        expect(rejected[0].reason.code).toBe("ROOM_NUMBER_ALREADY_EXISTS");
        await expect(
            getPrisma().room.count({ where: { unitId: unit.id } }),
        ).resolves.toBe(1);
    });

    it("refuses a room type of another hotel", async () => {
        const otherHotel = await createDraftHotel(owner, { name: "Outro" });
        const foreignType = await createRoomType(owner, otherHotel.id);

        await expect(
            createRoom(owner, unit.id, foreignType.id),
        ).rejects.toMatchObject({ code: "ROOM_TYPE_NOT_FOUND" });
    });

    it("allows the daily operation but not structural changes once published", async () => {
        const admin = await createAdmin();
        const room = await createRoom(owner, unit.id, roomType.id);
        await hotelService.submitForReview(owner, hotel.id);
        await hotelService.approveHotel(admin, hotel.id, { reason: "Ok." });

        const operated = await updateRoom(owner, room.id, {
            price: "280.00",
            status: ROOM_STATUSES.MAINTENANCE,
        });
        expect(operated).toMatchObject({
            price: "280.00",
            status: ROOM_STATUSES.MAINTENANCE,
        });
        await expect(
            roomTypeService.updateRoomType(owner, roomType.id, {
                defaultPrice: "260.00",
            }),
        ).resolves.toMatchObject({ defaultPrice: "260.00" });

        await expect(
            updateRoom(owner, room.id, { number: "999" }),
        ).rejects.toMatchObject({ code: "INVALID_HOTEL_STATUS" });
        await expect(
            createRoom(owner, unit.id, roomType.id, { number: "102" }),
        ).rejects.toMatchObject({ code: "INVALID_HOTEL_STATUS" });
        await expect(
            roomTypeService.updateRoomType(owner, roomType.id, {
                name: "Outro",
            }),
        ).rejects.toMatchObject({ code: "INVALID_HOTEL_STATUS" });
    });

    it("enforces the room CHECK constraints in MySQL", async () => {
        const room = await createRoom(owner, unit.id, roomType.id, {
            price: "300.00",
        });
        const prisma = getPrisma();

        await expect(
            prisma.$executeRawUnsafe(
                "UPDATE room SET status = 'INACTIVE', is_active = 1 WHERE id = ?",
                room.id,
            ),
        ).rejects.toThrow();
        await expect(
            prisma.$executeRawUnsafe(
                "UPDATE room SET is_active = 0 WHERE id = ?",
                room.id,
            ),
        ).rejects.toThrow();
        await expect(
            prisma.$executeRawUnsafe(
                "UPDATE room_price_history SET price = 0 WHERE room_id = ?",
                room.id,
            ),
        ).rejects.toThrow();
        await expect(
            prisma.$executeRawUnsafe(
                "UPDATE room_price_history SET valid_until = '2000-01-01' WHERE room_id = ?",
                room.id,
            ),
        ).rejects.toThrow();
        await expect(
            prisma.$executeRawUnsafe(
                "UPDATE room_type SET max_guests = 0 WHERE id = ?",
                roomType.id,
            ),
        ).rejects.toThrow();
        await expect(
            prisma.$executeRawUnsafe(
                "UPDATE room_type SET default_price = 0 WHERE id = ?",
                roomType.id,
            ),
        ).rejects.toThrow();
        await expect(
            prisma.$executeRawUnsafe(
                "UPDATE bed_configuration SET quantity = 0 WHERE room_type_id = ?",
                roomType.id,
            ),
        ).rejects.toThrow();
    });
});
