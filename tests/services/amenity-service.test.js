import { describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "../../src/lib/errors.js";
import { createAmenityService } from "../../src/services/amenity-service.js";

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });

function createWorld({ isTaken = false, createError } = {}) {
    const amenityRepository = {
        listAvailableTo: vi.fn(async () => [{ id: "a1" }]),
        countAvailableTo: vi.fn(async () => 1),
        existsVisibleByName: vi.fn(async () => isTaken),
        create: vi.fn(async (data) => {
            if (createError) {
                throw createError;
            }
            return { id: "a2", isGlobal: false, ...data };
        }),
    };
    return {
        amenityRepository,
        service: createAmenityService({ amenityRepository }),
    };
}

describe("amenityService.listAmenities", () => {
    it("lists the global amenities and the ones created by the manager", async () => {
        const { service, amenityRepository } = createWorld();

        const result = await service.listAmenities(MANAGER, {
            page: 2,
            pageSize: 5,
        });

        expect(result).toEqual({
            items: [{ id: "a1" }],
            page: 2,
            pageSize: 5,
            total: 1,
        });
        expect(amenityRepository.listAvailableTo).toHaveBeenCalledWith(
            MANAGER.id,
            { skip: 5, take: 5 },
        );
        expect(amenityRepository.countAvailableTo).toHaveBeenCalledWith(
            MANAGER.id,
        );
    });
});

describe("amenityService.createAmenity", () => {
    it("creates a non-global amenity owned by the manager (RF027)", async () => {
        const { service, amenityRepository } = createWorld();

        await service.createAmenity(MANAGER, { name: "Piscina" });

        expect(amenityRepository.create).toHaveBeenCalledWith({
            createdByUserId: MANAGER.id,
            name: "Piscina",
        });
    });

    it("refuses a name already used by a global amenity or by the manager", async () => {
        const { service, amenityRepository } = createWorld({ isTaken: true });

        await expect(
            service.createAmenity(MANAGER, { name: "Wi-Fi" }),
        ).rejects.toMatchObject({ code: ERROR_CODES.AMENITY_ALREADY_EXISTS });
        expect(amenityRepository.create).not.toHaveBeenCalled();
    });

    it("translates a concurrent duplicate (P2002) into 409", async () => {
        const { service } = createWorld({
            createError: Object.assign(new Error("unique"), { code: "P2002" }),
        });

        await expect(
            service.createAmenity(MANAGER, { name: "Piscina" }),
        ).rejects.toMatchObject({ code: ERROR_CODES.AMENITY_ALREADY_EXISTS });
    });

    it("rethrows unexpected errors", async () => {
        const { service } = createWorld({ createError: new Error("boom") });

        await expect(
            service.createAmenity(MANAGER, { name: "Piscina" }),
        ).rejects.toThrow("boom");
    });
});
