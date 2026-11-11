import { getPrisma } from "../lib/prisma.js";
import { MANAGER_ACCESS_FIELDS } from "./hotel-repository.js";

export const ROOM_PRICE_PERIOD_FIELDS = Object.freeze({
    id: true,
    roomId: true,
    startDate: true,
    endDate: true,
    price: true,
    createdAt: true,
    updatedAt: true,
});

const ROOM_PRICE_PERIOD_WITH_ACCESS_FIELDS = Object.freeze({
    ...ROOM_PRICE_PERIOD_FIELDS,
    room: {
        select: {
            isActive: true,
            unit: {
                select: {
                    hotelId: true,
                    hotel: {
                        select: {
                            ownerUserId: true,
                            status: true,
                            ...MANAGER_ACCESS_FIELDS,
                        },
                    },
                },
            },
        },
    },
});

export function createRoomPricePeriodRepository(getClient = getPrisma) {
    return Object.freeze({
        create(data, client = getClient()) {
            return client.roomPricePeriod.create({
                data,
                select: ROOM_PRICE_PERIOD_FIELDS,
            });
        },

        findByIdWithAccess(id, client = getClient()) {
            return client.roomPricePeriod.findUnique({
                where: { id },
                select: ROOM_PRICE_PERIOD_WITH_ACCESS_FIELDS,
            });
        },

        listByRoom(roomId, client = getClient()) {
            return client.roomPricePeriod.findMany({
                where: { roomId },
                select: ROOM_PRICE_PERIOD_FIELDS,
                orderBy: [{ startDate: "asc" }, { id: "asc" }],
            });
        },

        findOverlapping(
            roomId,
            { startDate, endDate, excludeId },
            client = getClient(),
        ) {
            return client.roomPricePeriod.findFirst({
                where: {
                    roomId,
                    startDate: { lte: endDate },
                    endDate: { gte: startDate },
                    ...(excludeId && { id: { not: excludeId } }),
                },
                select: { id: true },
            });
        },

        updateFields(id, data, client = getClient()) {
            return client.roomPricePeriod.update({
                where: { id },
                data,
                select: ROOM_PRICE_PERIOD_FIELDS,
            });
        },

        async deleteById(id, client = getClient()) {
            await client.roomPricePeriod.delete({
                where: { id },
                select: { id: true },
            });
        },
    });
}

export const roomPricePeriodRepository = createRoomPricePeriodRepository();
