import { describe, expect, it, vi } from "vitest";
import { AMENITY_TARGETS } from "../../../src/constants/amenity.js";
import { MEDIA_SCOPES } from "../../../src/constants/media.js";
import { MAX_PAGE_SIZE } from "../../../src/constants/pagination.js";
import { USER_ROLES } from "../../../src/constants/user-roles.js";
import { NotFoundError } from "../../../src/lib/errors.js";
import {
    createAdminHotelDetailLoader,
    listAllPages,
} from "../../../src/modules/hotels/admin-hotel-detail-data.js";

const ADMIN = Object.freeze({ id: "admin-1", role: USER_ROLES.ADMIN });
const HOTEL = Object.freeze({ id: "hotel-1", name: "Hotel Sol" });

function buildPage(items, total = items.length) {
    return { items, total };
}

function createFakeServices() {
    return {
        hotelService: { getHotel: vi.fn().mockResolvedValue(HOTEL) },
        unitService: {
            listUnits: vi
                .fn()
                .mockResolvedValue(
                    buildPage([{ id: "unit-1" }, { id: "unit-2" }]),
                ),
        },
        roomService: {
            listRooms: vi.fn(async (admin, unitId) =>
                buildPage([{ id: `${unitId}-room` }]),
            ),
        },
        roomTypeService: {
            listRoomTypes: vi
                .fn()
                .mockResolvedValue(buildPage([{ id: "type-1" }])),
        },
        policyService: {
            listPolicies: vi.fn().mockResolvedValue([{ id: "policy-1" }]),
        },
        acceptanceService: {
            listAcceptances: vi.fn().mockResolvedValue([{ id: "acc-1" }]),
        },
        amenityAssociationService: {
            listAmenities: vi.fn().mockResolvedValue([{ id: "amenity-1" }]),
        },
        loadGalleryData: vi
            .fn()
            .mockResolvedValue({ images: [], maxBytes: 1024 }),
    };
}

describe("listAllPages", () => {
    it("reads pages of the maximum size until the total is reached", async () => {
        const fetchPage = vi.fn(async ({ page }) =>
            buildPage(
                Array.from(
                    { length: page === 1 ? MAX_PAGE_SIZE : 1 },
                    (_, index) => `${page}-${index}`,
                ),
                MAX_PAGE_SIZE + 1,
            ),
        );

        const items = await listAllPages(fetchPage);

        expect(items).toHaveLength(MAX_PAGE_SIZE + 1);
        expect(fetchPage.mock.calls).toEqual([
            [{ page: 1, pageSize: MAX_PAGE_SIZE }],
            [{ page: 2, pageSize: MAX_PAGE_SIZE }],
        ]);
    });

    it("stops on an empty page even if the total is higher", async () => {
        const fetchPage = vi.fn().mockResolvedValue(buildPage([], 5));

        await expect(listAllPages(fetchPage)).resolves.toEqual([]);
        expect(fetchPage).toHaveBeenCalledTimes(1);
    });
});

describe("loadAdminHotelDetail", () => {
    it("loads the whole hotel as the admin, with the rooms of each unit", async () => {
        const services = createFakeServices();
        const { loadAdminHotelDetail } = createAdminHotelDetailLoader(services);

        const detail = await loadAdminHotelDetail(ADMIN, HOTEL.id);

        expect(detail).toEqual({
            hotel: HOTEL,
            units: [
                { id: "unit-1", rooms: [{ id: "unit-1-room" }] },
                { id: "unit-2", rooms: [{ id: "unit-2-room" }] },
            ],
            roomTypes: [{ id: "type-1" }],
            policies: [{ id: "policy-1" }],
            acceptances: [{ id: "acc-1" }],
            amenities: [{ id: "amenity-1" }],
            gallery: { images: [], maxBytes: 1024 },
        });
        expect(services.hotelService.getHotel).toHaveBeenCalledWith(
            ADMIN,
            HOTEL.id,
        );
        expect(services.roomService.listRooms).toHaveBeenCalledWith(
            ADMIN,
            "unit-2",
            { page: 1, pageSize: MAX_PAGE_SIZE },
        );
        expect(
            services.amenityAssociationService.listAmenities,
        ).toHaveBeenCalledWith(ADMIN, AMENITY_TARGETS.HOTEL, HOTEL.id);
        expect(services.loadGalleryData).toHaveBeenCalledWith(
            ADMIN,
            MEDIA_SCOPES.HOTEL,
            HOTEL.id,
        );
    });

    it("propagates the not found error without loading the rest", async () => {
        const services = createFakeServices();
        services.hotelService.getHotel.mockRejectedValue(
            new NotFoundError("HOTEL_NOT_FOUND", "Hotel não encontrado."),
        );
        const { loadAdminHotelDetail } = createAdminHotelDetailLoader(services);

        await expect(
            loadAdminHotelDetail(ADMIN, HOTEL.id),
        ).rejects.toBeInstanceOf(NotFoundError);
        expect(services.unitService.listUnits).not.toHaveBeenCalled();
    });
});
