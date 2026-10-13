import { getPrisma } from "../lib/prisma.js";
import { MANAGER_ACCESS_FIELDS } from "./hotel-repository.js";

export const POLICY_FIELDS = Object.freeze({
    id: true,
    hotelId: true,
    type: true,
    title: true,
    description: true,
    isSystem: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
});

const POLICY_WITH_HOTEL_FIELDS = Object.freeze({
    ...POLICY_FIELDS,
    hotel: {
        select: { ownerUserId: true, status: true, ...MANAGER_ACCESS_FIELDS },
    },
});

export function createHotelPolicyRepository(getClient = getPrisma) {
    return Object.freeze({
        create(data, client = getClient()) {
            return client.hotelPolicy.create({
                data: { ...data, isSystem: false },
                select: POLICY_FIELDS,
            });
        },

        findByIdWithHotel(id, client = getClient()) {
            return client.hotelPolicy.findUnique({
                where: { id },
                select: POLICY_WITH_HOTEL_FIELDS,
            });
        },

        listByHotel(hotelId, client = getClient()) {
            return client.hotelPolicy.findMany({
                where: { hotelId },
                select: POLICY_FIELDS,
                orderBy: { createdAt: "asc" },
            });
        },

        updateFields(id, data, client = getClient()) {
            return client.hotelPolicy.update({
                where: { id },
                data,
                select: { id: true },
            });
        },
    });
}

export const hotelPolicyRepository = createHotelPolicyRepository();
