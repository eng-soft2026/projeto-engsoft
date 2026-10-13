import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    UNIT_FIELDS,
    createUnitRepository,
} from "../../src/repositories/unit-repository.js";

function createFakePrisma() {
    return {
        hotelUnit: {
            create: vi.fn(async () => ({ id: "unit-1" })),
            findUnique: vi.fn(async () => null),
            findMany: vi.fn(async () => []),
            update: vi.fn(async () => ({ id: "unit-1" })),
        },
        address: { update: vi.fn(async () => ({ id: "address-1" })) },
        unitPhone: {
            deleteMany: vi.fn(async () => ({ count: 1 })),
            createMany: vi.fn(async () => ({ count: 1 })),
        },
    };
}

describe("unitRepository", () => {
    let prisma;
    let repository;

    beforeEach(() => {
        prisma = createFakePrisma();
        repository = createUnitRepository(() => prisma);
    });

    it("never selects the hotel owner or status in the public fields", () => {
        expect(UNIT_FIELDS).not.toHaveProperty("hotel");
    });

    it("create nests the address and the phones in one write", async () => {
        const address = { zipCode: "01310100", city: "São Paulo" };

        await repository.create({
            hotelId: "hotel-1",
            name: "Unidade",
            address,
            phones: ["11912345678", "1123456789"],
        });

        expect(prisma.hotelUnit.create).toHaveBeenCalledWith({
            data: {
                hotelId: "hotel-1",
                name: "Unidade",
                address: { create: address },
                phones: {
                    create: [{ phone: "11912345678" }, { phone: "1123456789" }],
                },
            },
            select: UNIT_FIELDS,
        });
    });

    it("findById selects only the public fields", async () => {
        await repository.findById("unit-1");

        expect(prisma.hotelUnit.findUnique).toHaveBeenCalledWith({
            where: { id: "unit-1" },
            select: UNIT_FIELDS,
        });
    });

    it("findByIdWithHotel adds only the owner, status and manager ids of the hotel", async () => {
        await repository.findByIdWithHotel("unit-1");

        const { select } = prisma.hotelUnit.findUnique.mock.calls[0][0];
        expect(select.hotel).toEqual({
            select: {
                ownerUserId: true,
                status: true,
                managers: { select: { userId: true } },
            },
        });
    });

    it("listByHotel lists the units of the hotel by creation date", async () => {
        await repository.listByHotel("hotel-1");

        expect(prisma.hotelUnit.findMany).toHaveBeenCalledWith({
            where: { hotelId: "hotel-1" },
            select: UNIT_FIELDS,
            orderBy: { createdAt: "asc" },
        });
    });

    it("updateFields updates the unit by id", async () => {
        await repository.updateFields("unit-1", { name: "Novo" });

        expect(prisma.hotelUnit.update).toHaveBeenCalledWith({
            where: { id: "unit-1" },
            data: { name: "Novo" },
            select: { id: true },
        });
    });

    it("replaceAddress clears the stale coordinates (RN088)", async () => {
        await repository.replaceAddress("unit-1", { city: "Santos" });

        expect(prisma.address.update).toHaveBeenCalledWith({
            where: { unitId: "unit-1" },
            data: { city: "Santos", latitude: null, longitude: null },
            select: { id: true },
        });
    });

    it("replacePhones deletes the old phones before creating the new ones", async () => {
        await repository.replacePhones("unit-1", ["11912345678"]);

        expect(prisma.unitPhone.deleteMany).toHaveBeenCalledWith({
            where: { unitId: "unit-1" },
        });
        expect(prisma.unitPhone.createMany).toHaveBeenCalledWith({
            data: [{ unitId: "unit-1", phone: "11912345678" }],
        });
        expect(
            prisma.unitPhone.deleteMany.mock.invocationCallOrder[0],
        ).toBeLessThan(prisma.unitPhone.createMany.mock.invocationCallOrder[0]);
    });

    it("uses the transaction client when one is given", async () => {
        const client = createFakePrisma();

        await repository.findById("unit-1", client);

        expect(client.hotelUnit.findUnique).toHaveBeenCalledOnce();
        expect(prisma.hotelUnit.findUnique).not.toHaveBeenCalled();
    });
});
