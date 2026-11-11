import { MAX_PAGE_SIZE } from "../../constants/pagination.js";
import { amenityAssociationService as defaultAmenityAssociationService } from "../../services/amenity-association-service.js";
import { amenityService as defaultAmenityService } from "../../services/amenity-service.js";
import { mergeAmenityOptions } from "./amenity-picker-options.js";

export function createAmenityPickerLoader({
    amenityService,
    amenityAssociationService,
}) {
    async function listAllAvailableAmenities(manager) {
        const amenities = [];
        let page = 1;
        let hasMore = true;
        while (hasMore) {
            const result = await amenityService.listAmenities(manager, {
                page,
                pageSize: MAX_PAGE_SIZE,
            });
            amenities.push(...result.items);
            hasMore =
                result.items.length === MAX_PAGE_SIZE &&
                amenities.length < result.total;
            page += 1;
        }
        return amenities;
    }

    async function loadAmenityPickerData(manager, target, targetId) {
        const [available, selected] = await Promise.all([
            listAllAvailableAmenities(manager),
            amenityAssociationService.listAmenities(manager, target, targetId),
        ]);
        return {
            amenities: mergeAmenityOptions(available, selected),
            selectedIds: selected.map(({ id }) => id),
        };
    }

    return Object.freeze({ loadAmenityPickerData });
}

export const { loadAmenityPickerData } = createAmenityPickerLoader({
    amenityService: defaultAmenityService,
    amenityAssociationService: defaultAmenityAssociationService,
});
