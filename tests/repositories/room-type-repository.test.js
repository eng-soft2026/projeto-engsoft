import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRoomTypeRepository } from "../../src/repositories/room-type-repository.js";

function createFakePrisma() {
    return {
        roomType: {
            create: vi.fn(async () => ({ id: "type-1" })),
            findUnique: vi.fn(async () => null),
            findMany: vi.fn(async () => []),
            update: vi.fn(async () => ({ id: "type-1" })),
            delete: vi.fn(async () => ({ id: "type-1" })),
        },
        bedConfiguration: {
            deleteMany: vi.fn(async () => ({ count: 1 })),
            createMany: vi.fn(async () => ({ count: 1 })),
        },
        room: { count: vi.fn(async () => 0) },
        roomTypeHistory: { count: vi.fn(async () => 0) },
    };
}

describe("roomTypeRepository", () => {
    let prisma;
    let repository;

    beforeEach(() => {
        prisma = createFakePrisma();
        repository = createRoomTypeRepository(() => prisma);
    });

    it("create nests the beds in one write", async () => {
        const beds = [{ bedType: "KING", quantity: 1 }];

        await repository.create({ hotelId: "hotel-1", name: "Suíte", beds });

        expect(prisma.roomType.create.mock.calls[0][0].data).toEqual({
            hotelId: "hotel-1",
            name: "Suíte",
            beds: { create: beds },
        });
    });

    it("replaceBeds deletes the old rows and creates the new ones", async () => {
        await repository.replaceBeds("type-1", [
            { bedType: "QUEEN", quantity: 2 },
        ]);

        expect(prisma.bedConfiguration.deleteMany).toHaveBeenCalledWith({
            where: { roomTypeId: "type-1" },
        });
        expect(prisma.bedConfiguration.createMany).toHaveBeenCalledWith({
            data: [{ roomTypeId: "type-1", bedType: "QUEEN", quantity: 2 }],
        });
    });

    it("hasRoomReferences is true for a room or a history row, false otherwise", async () => {
        await expect(repository.hasRoomReferences("type-1")).resolves.toBe(
            false,
        );

        prisma.room.count.mockResolvedValue(1);
        await expect(repository.hasRoomReferences("type-1")).resolves.toBe(
            true,
        );

        prisma.room.count.mockResolvedValue(0);
        prisma.roomTypeHistory.count.mockResolvedValue(1);
        await expect(repository.hasRoomReferences("type-1")).resolves.toBe(
            true,
        );
    });

    it("deleteById removes the beds before the type", async () => {
        const order = [];
        prisma.bedConfiguration.deleteMany.mockImplementation(async () => {
            order.push("beds");
        });
        prisma.roomType.delete.mockImplementation(async () => {
            order.push("type");
        });

        await repository.deleteById("type-1");

        expect(order).toEqual(["beds", "type"]);
    });

    it("lists the types of the hotel from the oldest", async () => {
        await repository.listByHotel("hotel-1");

        expect(prisma.roomType.findMany.mock.calls[0][0]).toMatchObject({
            where: { hotelId: "hotel-1" },
            orderBy: { createdAt: "asc" },
        });
    });
});
