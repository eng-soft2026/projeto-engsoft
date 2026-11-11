import { getMediaLimits } from "../../config/media.js";
import { MEDIA_SCOPES } from "../../constants/media.js";
import { hotelImageService as defaultHotelImageService } from "../../services/hotel-image-service.js";
import { roomTypeImageService as defaultRoomTypeImageService } from "../../services/room-type-image-service.js";
import { unitImageService as defaultUnitImageService } from "../../services/unit-image-service.js";

export function toClientGalleryImage(image) {
    return {
        id: image.id,
        url: image.url,
        position: image.position,
        width: image.width,
        height: image.height,
        isCover: image.isCover === true,
    };
}

export function createGalleryLoader({ imageServices, getLimits }) {
    async function loadGalleryData(user, scope, ownerId) {
        const imageService = imageServices[scope];
        if (!imageService) {
            throw new TypeError(`Unknown gallery scope: ${scope}`);
        }
        const images = await imageService.listImages(user, ownerId);
        return {
            images: images.map(toClientGalleryImage),
            maxBytes: getLimits().maxImageBytes,
        };
    }

    return Object.freeze({ loadGalleryData });
}

export const { loadGalleryData } = createGalleryLoader({
    imageServices: {
        [MEDIA_SCOPES.HOTEL]: defaultHotelImageService,
        [MEDIA_SCOPES.UNIT]: defaultUnitImageService,
        [MEDIA_SCOPES.ROOM_TYPE]: defaultRoomTypeImageService,
    },
    getLimits: getMediaLimits,
});
