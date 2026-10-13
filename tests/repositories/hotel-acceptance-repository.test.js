import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHotelAcceptanceRepository } from "../../src/repositories/hotel-acceptance-repository.js";

function createFakePrisma() {
    return {
        acceptanceType: { findMany: vi.fn(async () => []) },
        hotelAcceptance: {
            findMany: vi.fn(async () => []),
            deleteMany: vi.fn(async () => ({ count: 1 })),
            createMany: vi.fn(async () => ({ count: 2 })),
        },
    };
}

describe("hotelAcceptanceRepository", () => {
    let prisma;
    let repository;

    beforeEach(() => {
        prisma = createFakePrisma();
        repository = createHotelAcceptanceRepository(() => prisma);
    });

    it("listTypes selects only id and code", async () => {
        await repository.listTypes();

        expect(prisma.acceptanceType.findMany.mock.calls[0][0].select).toEqual({
            id: true,
            code: true,
        });
    });

    it("listByHotel filters by hotel and loads the type", async () => {
        await repository.listByHotel("h1");

        const query = prisma.hotelAcceptance.findMany.mock.calls[0][0];
        expect(query.where).toEqual({ hotelId: "h1" });
        expect(query.select.acceptanceType).toEqual({
            select: { code: true, name: true },
        });
    });

    it("replaceAll deletes the old rules and creates the new ones for the hotel", async () => {
        const rows = [
            {
                acceptanceTypeId: "t1",
                customLabel: null,
                isAllowed: true,
                details: null,
            },
        ];

        await repository.replaceAll("h1", rows);

        expect(prisma.hotelAcceptance.deleteMany).toHaveBeenCalledWith({
            where: { hotelId: "h1" },
        });
        expect(prisma.hotelAcceptance.createMany).toHaveBeenCalledWith({
            data: [{ hotelId: "h1", ...rows[0] }],
        });
    });
});
