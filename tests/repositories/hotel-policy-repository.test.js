import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHotelPolicyRepository } from "../../src/repositories/hotel-policy-repository.js";

function createFakePrisma() {
    return {
        hotelPolicy: {
            create: vi.fn(async () => ({ id: "p1" })),
            findUnique: vi.fn(async () => null),
            findMany: vi.fn(async () => []),
            update: vi.fn(async () => ({ id: "p1" })),
        },
    };
}

describe("hotelPolicyRepository", () => {
    let prisma;
    let repository;

    beforeEach(() => {
        prisma = createFakePrisma();
        repository = createHotelPolicyRepository(() => prisma);
    });

    it("create always stores a non-system policy", async () => {
        await repository.create({
            hotelId: "h1",
            type: "PARKING",
            title: "Estacionamento",
            description: "Gratuito.",
            isSystem: true,
        });

        expect(prisma.hotelPolicy.create.mock.calls[0][0].data.isSystem).toBe(
            false,
        );
    });

    it("findByIdWithHotel loads the hotel access data", async () => {
        await repository.findByIdWithHotel("p1");

        const { select } = prisma.hotelPolicy.findUnique.mock.calls[0][0];
        expect(select.hotel.select).toMatchObject({
            ownerUserId: true,
            status: true,
            managers: { select: { userId: true } },
        });
    });

    it("listByHotel orders from the oldest", async () => {
        await repository.listByHotel("h1");

        expect(prisma.hotelPolicy.findMany.mock.calls[0][0]).toMatchObject({
            where: { hotelId: "h1" },
            orderBy: { createdAt: "asc" },
        });
    });

    it("updateFields updates by id", async () => {
        await repository.updateFields("p1", { title: "Novo" });

        expect(prisma.hotelPolicy.update.mock.calls[0][0]).toMatchObject({
            where: { id: "p1" },
            data: { title: "Novo" },
        });
    });
});
