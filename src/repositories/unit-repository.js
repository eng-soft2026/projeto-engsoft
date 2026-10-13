import { getPrisma } from "../lib/prisma.js";
import { MANAGER_ACCESS_FIELDS } from "./hotel-repository.js";

const ADDRESS_FIELDS = Object.freeze({
    zipCode: true,
    street: true,
    number: true,
    complement: true,
    neighborhood: true,
    city: true,
    state: true,
    latitude: true,
    longitude: true,
});

const PHONE_FIELDS = Object.freeze({
    id: true,
    phone: true,
});

export const UNIT_FIELDS = Object.freeze({
    id: true,
    hotelId: true,
    name: true,
    email: true,
    checkInTime: true,
    checkOutTime: true,
    overbookingPercentage: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    address: { select: ADDRESS_FIELDS },
    phones: { select: PHONE_FIELDS, orderBy: { phone: "asc" } },
});

const UNIT_WITH_HOTEL_OWNER_FIELDS = Object.freeze({
    ...UNIT_FIELDS,
    hotel: {
        select: { ownerUserId: true, status: true, ...MANAGER_ACCESS_FIELDS },
    },
});

export function createUnitRepository(getClient = getPrisma) {
    return Object.freeze({
        create({ phones, address, ...unit }, client = getClient()) {
            return client.hotelUnit.create({
                data: {
                    ...unit,
                    address: { create: address },
                    phones: {
                        create: phones.map((phone) => ({ phone })),
                    },
                },
                select: UNIT_FIELDS,
            });
        },

        findById(id, client = getClient()) {
            return client.hotelUnit.findUnique({
                where: { id },
                select: UNIT_FIELDS,
            });
        },

        findByIdWithHotel(id, client = getClient()) {
            return client.hotelUnit.findUnique({
                where: { id },
                select: UNIT_WITH_HOTEL_OWNER_FIELDS,
            });
        },

        listByHotel(hotelId, client = getClient()) {
            return client.hotelUnit.findMany({
                where: { hotelId },
                select: UNIT_FIELDS,
                orderBy: { createdAt: "asc" },
            });
        },

        updateFields(id, data, client = getClient()) {
            return client.hotelUnit.update({
                where: { id },
                data,
                select: { id: true },
            });
        },

        replaceAddress(unitId, address, client = getClient()) {
            return client.address.update({
                where: { unitId },
                data: { ...address, latitude: null, longitude: null },
                select: { id: true },
            });
        },

        async replacePhones(unitId, phones, client = getClient()) {
            await client.unitPhone.deleteMany({ where: { unitId } });
            await client.unitPhone.createMany({
                data: phones.map((phone) => ({ unitId, phone })),
            });
        },
    });
}

export const unitRepository = createUnitRepository();
