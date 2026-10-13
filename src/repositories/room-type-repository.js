import { getPrisma } from "../lib/prisma.js";
import { MANAGER_ACCESS_FIELDS } from "./hotel-repository.js";

const BED_FIELDS = Object.freeze({
    bedType: true,
    quantity: true,
});

export const ROOM_TYPE_FIELDS = Object.freeze({
    id: true,
    hotelId: true,
    name: true,
    description: true,
    maxGuests: true,
    areaM2: true,
    defaultPrice: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    beds: { select: BED_FIELDS, orderBy: { bedType: "asc" } },
});

const ROOM_TYPE_WITH_HOTEL_FIELDS = Object.freeze({
    ...ROOM_TYPE_FIELDS,
    hotel: {
        select: { ownerUserId: true, status: true, ...MANAGER_ACCESS_FIELDS },
    },
});

export function createRoomTypeRepository(getClient = getPrisma) {
    return Object.freeze({
        create({ beds, ...roomType }, client = getClient()) {
            return client.roomType.create({
                data: { ...roomType, beds: { create: beds } },
                select: ROOM_TYPE_FIELDS,
            });
        },

        findById(id, client = getClient()) {
            return client.roomType.findUnique({
                where: { id },
                select: ROOM_TYPE_FIELDS,
            });
        },

        findByIdWithHotel(id, client = getClient()) {
            return client.roomType.findUnique({
                where: { id },
                select: ROOM_TYPE_WITH_HOTEL_FIELDS,
            });
        },

        listByHotel(hotelId, client = getClient()) {
            return client.roomType.findMany({
                where: { hotelId },
                select: ROOM_TYPE_FIELDS,
                orderBy: { createdAt: "asc" },
            });
        },

        updateFields(id, data, client = getClient()) {
            return client.roomType.update({
                where: { id },
                data,
                select: { id: true },
            });
        },

        async replaceBeds(roomTypeId, beds, client = getClient()) {
            await client.bedConfiguration.deleteMany({ where: { roomTypeId } });
            await client.bedConfiguration.createMany({
                data: beds.map((bed) => ({ roomTypeId, ...bed })),
            });
        },

        async hasRoomReferences(roomTypeId, client = getClient()) {
            const rooms = await client.room.count({ where: { roomTypeId } });
            if (rooms > 0) {
                return true;
            }
            const history = await client.roomTypeHistory.count({
                where: { roomTypeId },
            });
            return history > 0;
        },

        async deleteById(id, client = getClient()) {
            await client.bedConfiguration.deleteMany({
                where: { roomTypeId: id },
            });
            await client.roomType.delete({
                where: { id },
                select: { id: true },
            });
        },
    });
}

export const roomTypeRepository = createRoomTypeRepository();
