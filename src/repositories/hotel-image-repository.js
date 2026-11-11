import { getPrisma } from "../lib/prisma.js";

export const HOTEL_IMAGE_FIELDS = Object.freeze({
    id: true,
    hotelId: true,
    cloudinaryPublicId: true,
    url: true,
    isCover: true,
    position: true,
    format: true,
    bytes: true,
    width: true,
    height: true,
    createdAt: true,
    updatedAt: true,
});

export function createHotelImageRepository(getClient = getPrisma) {
    return Object.freeze({
        listByHotel(hotelId, client = getClient()) {
            return client.hotelImage.findMany({
                where: { hotelId },
                select: HOTEL_IMAGE_FIELDS,
                orderBy: [{ position: "asc" }, { createdAt: "asc" }],
            });
        },

        findById(id, client = getClient()) {
            return client.hotelImage.findUnique({
                where: { id },
                select: HOTEL_IMAGE_FIELDS,
            });
        },

        create(data, client = getClient()) {
            return client.hotelImage.create({
                data,
                select: HOTEL_IMAGE_FIELDS,
            });
        },

        updateFields(id, data, client = getClient()) {
            return client.hotelImage.update({
                where: { id },
                data,
                select: { id: true },
            });
        },

        clearCover(hotelId, client = getClient()) {
            return client.hotelImage.updateMany({
                where: { hotelId, isCover: true },
                data: { isCover: false },
            });
        },

        delete(id, client = getClient()) {
            return client.hotelImage.delete({
                where: { id },
                select: { id: true },
            });
        },
    });
}

export const hotelImageRepository = createHotelImageRepository();
