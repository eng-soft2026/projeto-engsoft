import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    ROOM_FIELDS,
    createRoomRepository,
} from "../../src/repositories/room-repository.js";

const NOW = new Date("2026-10-13T12:00:00.000Z");

function createFakePrisma() {
    return {
        room: {
            create: vi.fn(async () => ({ id: "room-1" })),
            findUnique: vi.fn(async () => null),
            findMany: vi.fn(async () => []),
            update: vi.fn(async () => ({ id: "room-1" })),
            delete: vi.fn(async () => ({ id: "room-1" })),
        },
        roomTypeHistory: {
            updateMany: vi.fn(async () => ({ count: 1 })),
            create: vi.fn(async () => ({ id: "history-1" })),
            count: vi.fn(async () => 1),
            deleteMany: vi.fn(async () => ({ count: 1 })),
        },
        roomPriceHistory: {
            updateMany: vi.fn(async () => ({ count: 1 })),
            create: vi.fn(async () => ({ id: "price-1" })),
            count: vi.fn(async () => 0),
        },
    };
}

describe("roomRepository", () => {
    let prisma;
    let repository;

    beforeEach(() => {
        prisma = createFakePrisma();
        repository = createRoomRepository(() => prisma);
    });

    it("reads only the open price row (valid_until null) in the public fields", () => {
        expect(ROOM_FIELDS.priceHistory.where).toEqual({ validUntil: null });
        expect(ROOM_FIELDS.priceHistory.take).toBe(1);
    });

    it("create nests the first type history row and the first price row", async () => {
        await repository.create({
            unitId: "unit-1",
            roomTypeId: "type-1",
            number: "101",
            price: "299.90",
            validFrom: NOW,
        });

        expect(prisma.room.create.mock.calls[0][0].data).toEqual({
            unitId: "unit-1",
            roomTypeId: "type-1",
            number: "101",
            typeHistory: {
                create: [{ roomTypeId: "type-1", validFrom: NOW }],
            },
            priceHistory: { create: [{ price: "299.90", validFrom: NOW }] },
        });
    });

    it("create writes no price row when the room has no price of its own", async () => {
        await repository.create({
            unitId: "unit-1",
            roomTypeId: "type-1",
            number: "101",
            validFrom: NOW,
        });

        expect(prisma.room.create.mock.calls[0][0].data).not.toHaveProperty(
            "priceHistory",
        );
    });

    it("changeRoomType closes the open row and opens another at the same instant", async () => {
        await repository.changeRoomType("room-1", "type-2", NOW);

        expect(prisma.roomTypeHistory.updateMany).toHaveBeenCalledWith({
            where: { roomId: "room-1", validUntil: null },
            data: { validUntil: NOW },
        });
        expect(prisma.roomTypeHistory.create.mock.calls[0][0].data).toEqual({
            roomId: "room-1",
            roomTypeId: "type-2",
            validFrom: NOW,
        });
    });

    it("changePrice closes the open row and opens a new one", async () => {
        await repository.changePrice("room-1", "310.00", NOW);

        expect(prisma.roomPriceHistory.updateMany).toHaveBeenCalledWith({
            where: { roomId: "room-1", validUntil: null },
            data: { validUntil: NOW },
        });
        expect(prisma.roomPriceHistory.create.mock.calls[0][0].data).toEqual({
            roomId: "room-1",
            price: "310.00",
            validFrom: NOW,
        });
    });

    it("changePrice with null only closes the open row", async () => {
        await repository.changePrice("room-1", null, NOW);

        expect(prisma.roomPriceHistory.updateMany).toHaveBeenCalledOnce();
        expect(prisma.roomPriceHistory.create).not.toHaveBeenCalled();
    });

    it("hasHistory is true when any price row exists", async () => {
        prisma.roomPriceHistory.count.mockResolvedValue(1);

        await expect(repository.hasHistory("room-1")).resolves.toBe(true);
    });

    it("hasHistory ignores the initial type row but not a type change", async () => {
        prisma.roomTypeHistory.count.mockResolvedValue(1);
        await expect(repository.hasHistory("room-1")).resolves.toBe(false);

        prisma.roomTypeHistory.count.mockResolvedValue(2);
        await expect(repository.hasHistory("room-1")).resolves.toBe(true);
    });

    it("deleteById removes the type history before the room", async () => {
        const order = [];
        prisma.roomTypeHistory.deleteMany.mockImplementation(async () => {
            order.push("history");
        });
        prisma.room.delete.mockImplementation(async () => {
            order.push("room");
        });

        await repository.deleteById("room-1");

        expect(order).toEqual(["history", "room"]);
    });

    it("uses the client it receives (the transaction)", async () => {
        const client = createFakePrisma();

        await repository.findByIdWithAccess("room-1", client);

        expect(client.room.findUnique).toHaveBeenCalled();
        expect(prisma.room.findUnique).not.toHaveBeenCalled();
    });
});
