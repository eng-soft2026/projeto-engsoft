import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHotelManagerRepository } from "../../src/repositories/hotel-manager-repository.js";

function createFakePrisma() {
    return {
        hotelManager: {
            findUnique: vi.fn(async () => null),
            create: vi.fn(async () => ({ hotelId: "hotel-1" })),
            deleteMany: vi.fn(async () => ({ count: 1 })),
        },
    };
}

describe("hotelManagerRepository", () => {
    let prisma;
    let repository;

    beforeEach(() => {
        prisma = createFakePrisma();
        repository = createHotelManagerRepository(() => prisma);
    });

    it("exists looks the pair up by its composite key", async () => {
        prisma.hotelManager.findUnique.mockResolvedValue({ userId: "user-1" });

        await expect(repository.exists("hotel-1", "user-1")).resolves.toBe(
            true,
        );
        expect(prisma.hotelManager.findUnique).toHaveBeenCalledWith({
            where: { hotelId_userId: { hotelId: "hotel-1", userId: "user-1" } },
            select: { userId: true },
        });
    });

    it("exists is false when the pair is missing", async () => {
        await expect(repository.exists("hotel-1", "user-1")).resolves.toBe(
            false,
        );
    });

    it("create links the user to the hotel", async () => {
        await repository.create("hotel-1", "user-1");

        expect(prisma.hotelManager.create).toHaveBeenCalledWith({
            data: { hotelId: "hotel-1", userId: "user-1" },
            select: { hotelId: true, userId: true, createdAt: true },
        });
    });

    it("delete removes only the pair and reports whether a row existed", async () => {
        await expect(repository.delete("hotel-1", "user-1")).resolves.toBe(
            true,
        );
        expect(prisma.hotelManager.deleteMany).toHaveBeenCalledWith({
            where: { hotelId: "hotel-1", userId: "user-1" },
        });

        prisma.hotelManager.deleteMany.mockResolvedValue({ count: 0 });
        await expect(repository.delete("hotel-1", "user-2")).resolves.toBe(
            false,
        );
    });

    it("uses the transaction client when one is given", async () => {
        const client = createFakePrisma();

        await repository.create("hotel-1", "user-1", client);

        expect(client.hotelManager.create).toHaveBeenCalledOnce();
        expect(prisma.hotelManager.create).not.toHaveBeenCalled();
    });
});
