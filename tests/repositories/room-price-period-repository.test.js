import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    ROOM_PRICE_PERIOD_FIELDS,
    createRoomPricePeriodRepository,
} from "../../src/repositories/room-price-period-repository.js";

const START = new Date("2026-12-20T00:00:00.000Z");
const END = new Date("2026-12-31T00:00:00.000Z");

function createFakePrisma() {
    return {
        roomPricePeriod: {
            create: vi.fn(async () => ({ id: "period-1" })),
            findUnique: vi.fn(async () => null),
            findMany: vi.fn(async () => []),
            findFirst: vi.fn(async () => null),
            update: vi.fn(async () => ({ id: "period-1" })),
            delete: vi.fn(async () => ({ id: "period-1" })),
        },
    };
}

describe("roomPricePeriodRepository", () => {
    let prisma;
    let repository;

    beforeEach(() => {
        prisma = createFakePrisma();
        repository = createRoomPricePeriodRepository(() => prisma);
    });

    it("findOverlapping uses inclusive bounds, so touching periods do not overlap", async () => {
        await repository.findOverlapping("room-1", {
            startDate: START,
            endDate: END,
        });

        expect(prisma.roomPricePeriod.findFirst).toHaveBeenCalledWith({
            where: {
                roomId: "room-1",
                startDate: { lte: END },
                endDate: { gte: START },
            },
            select: { id: true },
        });
    });

    it("findOverlapping excludes the period being edited", async () => {
        await repository.findOverlapping("room-1", {
            startDate: START,
            endDate: END,
            excludeId: "period-1",
        });

        expect(
            prisma.roomPricePeriod.findFirst.mock.calls[0][0].where.id,
        ).toEqual({ not: "period-1" });
    });

    it("listByRoom orders by start date", async () => {
        await repository.listByRoom("room-1");

        expect(prisma.roomPricePeriod.findMany).toHaveBeenCalledWith({
            where: { roomId: "room-1" },
            select: ROOM_PRICE_PERIOD_FIELDS,
            orderBy: [{ startDate: "asc" }, { id: "asc" }],
        });
    });

    it("uses the client it receives (the transaction)", async () => {
        const client = createFakePrisma();

        await repository.deleteById("period-1", client);

        expect(client.roomPricePeriod.delete).toHaveBeenCalled();
        expect(prisma.roomPricePeriod.delete).not.toHaveBeenCalled();
    });
});
