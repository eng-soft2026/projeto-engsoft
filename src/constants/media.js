export const MEDIA_SCOPES = Object.freeze({
    HOTEL: "HOTEL",
    UNIT: "UNIT",
    ROOM_TYPE: "ROOM_TYPE",
});

export const MEDIA_SCOPE_FOLDERS = Object.freeze({
    [MEDIA_SCOPES.HOTEL]: "hotels",
    [MEDIA_SCOPES.UNIT]: "units",
    [MEDIA_SCOPES.ROOM_TYPE]: "room-types",
});

export const MEDIA_KINDS = Object.freeze({
    IMAGE: "IMAGE",
    VIDEO: "VIDEO",
});

export const MEDIA_RESOURCE_TYPES = Object.freeze({
    [MEDIA_KINDS.IMAGE]: "image",
    [MEDIA_KINDS.VIDEO]: "video",
});

export const MEDIA_FORMATS_BY_MIME_TYPE = Object.freeze({
    "image/jpeg": Object.freeze({
        kind: MEDIA_KINDS.IMAGE,
        extensions: Object.freeze(["jpg", "jpeg"]),
    }),
    "video/mp4": Object.freeze({
        kind: MEDIA_KINDS.VIDEO,
        extensions: Object.freeze(["mp4"]),
    }),
    "video/webm": Object.freeze({
        kind: MEDIA_KINDS.VIDEO,
        extensions: Object.freeze(["webm"]),
    }),
    "video/quicktime": Object.freeze({
        kind: MEDIA_KINDS.VIDEO,
        extensions: Object.freeze(["mov"]),
    }),
});

export const MEDIA_SCOPE_KINDS = Object.freeze({
    [MEDIA_SCOPES.HOTEL]: Object.freeze([MEDIA_KINDS.IMAGE]),
    [MEDIA_SCOPES.UNIT]: Object.freeze([MEDIA_KINDS.IMAGE]),
    [MEDIA_SCOPES.ROOM_TYPE]: Object.freeze([MEDIA_KINDS.IMAGE]),
});

export const SIGNED_UPLOAD_TTL_SECONDS = 60 * 60;

export const MAX_HOTEL_IMAGES = 10;
