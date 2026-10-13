import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAmenityRepository } from "../../src/repositories/amenity-repository.js";

function createFakePrisma() {
    const association = () => ({
        findMany: vi.fn(async () => [{ amenity: { id: "a1", name: "Wi-Fi" } }]),
        deleteMany: vi.fn(async () => ({ count: 1 })),
        createMany: vi.fn(async () => ({ count: 2 })),
    });
    return {
        amenity: {
            create: vi.fn(async () => ({ id: "a1" })),
            findMany: vi.fn(async () => [{ id: "a1" }]),
            findFirst: vi.fn(async () => null),
        },
        hotelAmenity: association(),
        unitAmenity: association(),
        roomTypeAmenity: association(),
        roomAmenity: association(),
    };
}

describe("amenityRepository", () => {
    let prisma;
    let repository;

    beforeEach(() => {
        prisma = createFakePrisma();
        repository = createAmenityRepository(() => prisma);
    });

    it("create never makes a global amenity", async () => {
        await repository.create({ createdByUserId: "u1", name: "Piscina" });

        expect(prisma.amenity.create.mock.calls[0][0].data).toEqual({
            createdByUserId: "u1",
            name: "Piscina",
            isGlobal: false,
        });
    });

    it("listAvailableTo returns active global amenities and the ones of the user", async () => {
        await repository.listAvailableTo("u1");

        expect(prisma.amenity.findMany.mock.calls[0][0].where).toEqual({
            isActive: true,
            OR: [{ isGlobal: true }, { createdByUserId: { in: ["u1"] } }],
        });
    });

    it("findIdsAvailableTo filters by ids and creators and returns only ids", async () => {
        const ids = await repository.findIdsAvailableTo(["a1"], ["u1", "u2"]);

        expect(ids).toEqual(["a1"]);
        expect(prisma.amenity.findMany.mock.calls[0][0].where).toEqual({
            id: { in: ["a1"] },
            isActive: true,
            OR: [{ isGlobal: true }, { createdByUserId: { in: ["u1", "u2"] } }],
        });
    });

    it("existsVisibleByName checks global amenities and the ones of the user", async () => {
        prisma.amenity.findFirst.mockResolvedValueOnce({ id: "a1" });

        await expect(
            repository.existsVisibleByName("Wi-Fi", "u1"),
        ).resolves.toBe(true);
        expect(prisma.amenity.findFirst.mock.calls[0][0].where).toEqual({
            name: "Wi-Fi",
            OR: [{ isGlobal: true }, { createdByUserId: "u1" }],
        });
        await expect(repository.existsVisibleByName("X", "u1")).resolves.toBe(
            false,
        );
    });

    it.each([
        ["hotel", "hotelAmenity", "hotelId"],
        ["unit", "unitAmenity", "unitId"],
        ["roomType", "roomTypeAmenity", "roomTypeId"],
        ["room", "roomAmenity", "roomId"],
    ])(
        "uses the %s association table (%s) keyed by %s",
        async (target, model, ownerKey) => {
            const amenities = await repository.listAssociated(target, "o1");
            await repository.replaceAssociations(target, "o1", ["a1", "a2"]);

            expect(amenities).toEqual([{ id: "a1", name: "Wi-Fi" }]);
            expect(prisma[model].findMany.mock.calls[0][0].where).toEqual({
                [ownerKey]: "o1",
            });
            expect(prisma[model].deleteMany).toHaveBeenCalledWith({
                where: { [ownerKey]: "o1" },
            });
            expect(prisma[model].createMany).toHaveBeenCalledWith({
                data: [
                    { [ownerKey]: "o1", amenityId: "a1" },
                    { [ownerKey]: "o1", amenityId: "a2" },
                ],
            });
        },
    );

    it("runs on the transaction client when one is passed", async () => {
        const client = createFakePrisma();

        await repository.replaceAssociations("hotel", "h1", [], client);

        expect(client.hotelAmenity.deleteMany).toHaveBeenCalled();
        expect(prisma.hotelAmenity.deleteMany).not.toHaveBeenCalled();
    });
});
