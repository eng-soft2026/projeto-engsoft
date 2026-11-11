import { MAX_HOTEL_IMAGES, MEDIA_SCOPES } from "../../constants/media.js";

export const GALLERY_TARGETS = Object.freeze({
    [MEDIA_SCOPES.HOTEL]: Object.freeze({
        resourcePath: "hotels",
        maxImages: MAX_HOTEL_IMAGES,
        hasCover: true,
        ownerLabel: "do hotel",
    }),
    [MEDIA_SCOPES.UNIT]: Object.freeze({
        resourcePath: "units",
        maxImages: null,
        hasCover: true,
        ownerLabel: "da unidade",
    }),
    [MEDIA_SCOPES.ROOM_TYPE]: Object.freeze({
        resourcePath: "room-types",
        maxImages: null,
        hasCover: false,
        ownerLabel: "do tipo de acomodação",
    }),
});

export function getGalleryTarget(scope) {
    const target = GALLERY_TARGETS[scope];
    if (!target) {
        throw new TypeError(`Unknown gallery scope: ${scope}`);
    }
    return target;
}

export function buildGalleryImagesPath(scope, targetId) {
    return `/api/${getGalleryTarget(scope).resourcePath}/${targetId}/images`;
}

export function buildGalleryImagePath(scope, targetId, imageId) {
    return `${buildGalleryImagesPath(scope, targetId)}/${imageId}`;
}

export function buildMediaAssetPath(scope, targetId, assetId) {
    const query = new URLSearchParams({ scope, targetId });
    return `/api/media/${assetId}?${query}`;
}
