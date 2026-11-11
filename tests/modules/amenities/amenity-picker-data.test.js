import { describe, expect, it, vi } from "vitest";
import { AMENITY_TARGETS } from "../../../src/constants/amenity.js";
import { MAX_PAGE_SIZE } from "../../../src/constants/pagination.js";
import { createAmenityPickerLoader } from "../../../src/modules/amenities/amenity-picker-data.js";

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });

function buildAmenity(index, overrides = {}) {
    return {
        id: `amenity-${String(index).padStart(3, "0")}`,
        name: `Comodidade ${String(index).padStart(3, "0")}`,
        isGlobal: true,
        isActive: true,
        createdAt: new Date("2026-11-11T00:00:00.000Z"),
        ...overrides,
    };
}

function toOption({ id, name, isGlobal, isActive }) {
    return { id, name, isGlobal, isActive };
}

function createLoader({ pages, selected = [] }) {
    const amenityService = {
        listAmenities: vi.fn(async (_manager, { page, pageSize }) => ({
            items: pages[page - 1] ?? [],
            page,
            pageSize,
            total: pages.flat().length,
        })),
    };
    const amenityAssociationService = {
        listAmenities: vi.fn().mockResolvedValue(selected),
    };
    const loader = createAmenityPickerLoader({
        amenityService,
        amenityAssociationService,
    });
    return { loader, amenityService, amenityAssociationService };
}

describe("createAmenityPickerLoader", () => {
    it("merges the available and the associated amenities", async () => {
        const wifi = buildAmenity(1, { name: "Wi-Fi" });
        const pool = buildAmenity(2, { name: "Piscina" });
        const otherManagerAmenity = buildAmenity(3, {
            name: "Bicicletas",
            isGlobal: false,
        });
        const { loader, amenityService, amenityAssociationService } =
            createLoader({
                pages: [[pool, wifi]],
                selected: [otherManagerAmenity, wifi],
            });

        const result = await loader.loadAmenityPickerData(
            MANAGER,
            AMENITY_TARGETS.UNIT,
            "unit-1",
        );

        expect(amenityService.listAmenities).toHaveBeenCalledWith(MANAGER, {
            page: 1,
            pageSize: MAX_PAGE_SIZE,
        });
        expect(amenityAssociationService.listAmenities).toHaveBeenCalledWith(
            MANAGER,
            AMENITY_TARGETS.UNIT,
            "unit-1",
        );
        expect(result).toEqual({
            amenities: [otherManagerAmenity, pool, wifi].map(toOption),
            selectedIds: [otherManagerAmenity.id, wifi.id],
        });
    });

    it("reads every page of available amenities", async () => {
        const firstPage = Array.from({ length: MAX_PAGE_SIZE }, (_, index) =>
            buildAmenity(index),
        );
        const secondPage = [buildAmenity(MAX_PAGE_SIZE)];
        const { loader, amenityService } = createLoader({
            pages: [firstPage, secondPage],
        });

        const result = await loader.loadAmenityPickerData(
            MANAGER,
            AMENITY_TARGETS.HOTEL,
            "hotel-1",
        );

        expect(amenityService.listAmenities).toHaveBeenCalledTimes(2);
        expect(amenityService.listAmenities).toHaveBeenLastCalledWith(MANAGER, {
            page: 2,
            pageSize: MAX_PAGE_SIZE,
        });
        expect(result.amenities).toHaveLength(MAX_PAGE_SIZE + 1);
    });

    it("stops after a full last page", async () => {
        const firstPage = Array.from({ length: MAX_PAGE_SIZE }, (_, index) =>
            buildAmenity(index),
        );
        const { loader, amenityService } = createLoader({ pages: [firstPage] });

        await loader.loadAmenityPickerData(
            MANAGER,
            AMENITY_TARGETS.ROOM,
            "room-1",
        );

        expect(amenityService.listAmenities).toHaveBeenCalledTimes(1);
    });
});
