import { getPrisma } from "../lib/prisma.js";

export function createHotelManagerRepository(getClient = getPrisma) {
    return Object.freeze({
        async exists(hotelId, userId, client = getClient()) {
            const manager = await client.hotelManager.findUnique({
                where: { hotelId_userId: { hotelId, userId } },
                select: { userId: true },
            });
            return manager !== null;
        },

        create(hotelId, userId, client = getClient()) {
            return client.hotelManager.create({
                data: { hotelId, userId },
                select: { hotelId: true, userId: true, createdAt: true },
            });
        },

        async delete(hotelId, userId, client = getClient()) {
            const { count } = await client.hotelManager.deleteMany({
                where: { hotelId, userId },
            });
            return count === 1;
        },
    });
}

export const hotelManagerRepository = createHotelManagerRepository();
