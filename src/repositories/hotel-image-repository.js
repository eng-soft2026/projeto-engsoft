import { getPrisma } from "../lib/prisma.js";
import { buildImageFields, createImageRepository } from "./image-repository.js";

const HOTEL_IMAGE_TABLE = Object.freeze({
    model: "hotelImage",
    ownerField: "hotelId",
});

export const HOTEL_IMAGE_FIELDS = buildImageFields(HOTEL_IMAGE_TABLE);

export function createHotelImageRepository(getClient = getPrisma) {
    return createImageRepository(HOTEL_IMAGE_TABLE, getClient);
}

export const hotelImageRepository = createHotelImageRepository();
