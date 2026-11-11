import { getPrisma } from "../lib/prisma.js";
import { buildImageFields, createImageRepository } from "./image-repository.js";

const ROOM_TYPE_IMAGE_TABLE = Object.freeze({
    model: "roomTypeImage",
    ownerField: "roomTypeId",
    hasCover: false,
});

export const ROOM_TYPE_IMAGE_FIELDS = buildImageFields(ROOM_TYPE_IMAGE_TABLE);

export function createRoomTypeImageRepository(getClient = getPrisma) {
    return createImageRepository(ROOM_TYPE_IMAGE_TABLE, getClient);
}

export const roomTypeImageRepository = createRoomTypeImageRepository();
