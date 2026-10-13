import { getPrisma } from "../lib/prisma.js";
import { MANAGER_ACCESS_FIELDS } from "./hotel-repository.js";

export const ROOM_FIELDS = Object.freeze({
    id: true,
    unitId: true,
    roomTypeId: true,
    number: true,
    floor: true,
    status: true,
    isAccessible: true,
    administrativeNotes: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    roomType: { select: { id: true, name: true, defaultPrice: true } },
    priceHistory: {
        where: { validUntil: null },
        select: { price: true, validFrom: true },
        take: 1,
    },
});

const ROOM_WITH_ACCESS_FIELDS = Object.freeze({
    ...ROOM_FIELDS,
    unit: {
        select: {
            hotelId: true,
            isActive: true,
            hotel: {
                select: {
                    ownerUserId: true,
                    status: true,
                    ...MANAGER_ACCESS_FIELDS,
                },
            },
        },
    },
});

export function createRoomRepository(getClient = getPrisma) {
    return Object.freeze({
        create({ price, validFrom, ...room }, client = getClient()) {
            return client.room.create({
                data: {
                    ...room,
                    typeHistory: {
                        create: [{ roomTypeId: room.roomTypeId, validFrom }],
                    },
                    ...(price && {
                        priceHistory: { create: [{ price, validFrom }] },
                    }),
                },
                select: ROOM_FIELDS,
            });
        },

        findByIdWithAccess(id, client = getClient()) {
            return client.room.findUnique({
                where: { id },
                select: ROOM_WITH_ACCESS_FIELDS,
            });
        },

        listByUnit(unitId, client = getClient()) {
            return client.room.findMany({
                where: { unitId },
                select: ROOM_FIELDS,
                orderBy: { number: "asc" },
            });
        },

        updateFields(id, data, client = getClient()) {
            return client.room.update({
                where: { id },
                data,
                select: { id: true },
            });
        },

        async changeRoomType(roomId, roomTypeId, now, client = getClient()) {
            await client.roomTypeHistory.updateMany({
                where: { roomId, validUntil: null },
                data: { validUntil: now },
            });
            await client.roomTypeHistory.create({
                data: { roomId, roomTypeId, validFrom: now },
                select: { id: true },
            });
        },

        async changePrice(roomId, price, now, client = getClient()) {
            await client.roomPriceHistory.updateMany({
                where: { roomId, validUntil: null },
                data: { validUntil: now },
            });
            if (price === null) {
                return;
            }
            await client.roomPriceHistory.create({
                data: { roomId, price, validFrom: now },
                select: { id: true },
            });
        },

        async hasHistory(roomId, client = getClient()) {
            const prices = await client.roomPriceHistory.count({
                where: { roomId },
            });
            if (prices > 0) {
                return true;
            }
            const types = await client.roomTypeHistory.count({
                where: { roomId },
            });
            return types > 1;
        },

        async deleteById(id, client = getClient()) {
            await client.roomTypeHistory.deleteMany({ where: { roomId: id } });
            await client.room.delete({ where: { id }, select: { id: true } });
        },
    });
}

export const roomRepository = createRoomRepository();
