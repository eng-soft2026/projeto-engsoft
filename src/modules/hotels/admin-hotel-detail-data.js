import { AMENITY_TARGETS } from "../../constants/amenity.js";
import { MEDIA_SCOPES } from "../../constants/media.js";
import { MAX_PAGE_SIZE } from "../../constants/pagination.js";
import { acceptanceService as defaultAcceptanceService } from "../../services/acceptance-service.js";
import { amenityAssociationService as defaultAmenityAssociationService } from "../../services/amenity-association-service.js";
import { hotelService as defaultHotelService } from "../../services/hotel-service.js";
import { policyService as defaultPolicyService } from "../../services/policy-service.js";
import { roomService as defaultRoomService } from "../../services/room-service.js";
import { roomTypeService as defaultRoomTypeService } from "../../services/room-type-service.js";
import { unitService as defaultUnitService } from "../../services/unit-service.js";
import { loadGalleryData as defaultLoadGalleryData } from "../media/gallery-data.js";

export async function listAllPages(fetchPage) {
    const items = [];
    let page = 1;
    let hasMore = true;
    while (hasMore) {
        const result = await fetchPage({ page, pageSize: MAX_PAGE_SIZE });
        items.push(...result.items);
        hasMore = result.items.length > 0 && items.length < result.total;
        page += 1;
    }
    return items;
}

export function createAdminHotelDetailLoader({
    hotelService,
    unitService,
    roomService,
    roomTypeService,
    policyService,
    acceptanceService,
    amenityAssociationService,
    loadGalleryData,
}) {
    async function loadUnitWithRooms(admin, unit) {
        const rooms = await listAllPages((pagination) =>
            roomService.listRooms(admin, unit.id, pagination),
        );
        return { ...unit, rooms };
    }

    async function loadAdminHotelDetail(admin, hotelId) {
        const hotel = await hotelService.getHotel(admin, hotelId);
        const [units, roomTypes, policies, acceptances, amenities, gallery] =
            await Promise.all([
                listAllPages((pagination) =>
                    unitService.listUnits(admin, hotel.id, pagination),
                ),
                listAllPages((pagination) =>
                    roomTypeService.listRoomTypes(admin, hotel.id, pagination),
                ),
                policyService.listPolicies(admin, hotel.id),
                acceptanceService.listAcceptances(admin, hotel.id),
                amenityAssociationService.listAmenities(
                    admin,
                    AMENITY_TARGETS.HOTEL,
                    hotel.id,
                ),
                loadGalleryData(admin, MEDIA_SCOPES.HOTEL, hotel.id),
            ]);
        const unitsWithRooms = await Promise.all(
            units.map((unit) => loadUnitWithRooms(admin, unit)),
        );
        return {
            hotel,
            units: unitsWithRooms,
            roomTypes,
            policies,
            acceptances,
            amenities,
            gallery,
        };
    }

    return Object.freeze({ loadAdminHotelDetail });
}

export const { loadAdminHotelDetail } = createAdminHotelDetailLoader({
    hotelService: defaultHotelService,
    unitService: defaultUnitService,
    roomService: defaultRoomService,
    roomTypeService: defaultRoomTypeService,
    policyService: defaultPolicyService,
    acceptanceService: defaultAcceptanceService,
    amenityAssociationService: defaultAmenityAssociationService,
    loadGalleryData: defaultLoadGalleryData,
});
