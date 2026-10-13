import { getPrisma } from "../lib/prisma.js";
import { PUBLIC_REVIEW_NOTE_FIELDS } from "./hotel-review-note-repository.js";

export const PUBLIC_HOTEL_FIELDS = Object.freeze({
    id: true,
    ownerUserId: true,
    name: true,
    description: true,
    category: true,
    cnpj: true,
    email: true,
    status: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
});

export const MANAGER_ACCESS_FIELDS = Object.freeze({
    managers: { select: { userId: true } },
});

export const OWNER_SUMMARY_FIELDS = Object.freeze({
    id: true,
    name: true,
    email: true,
});

export const HOTEL_REVIEW_LIST_LIMIT = 100;

const HOTEL_WITH_ACCESS_FIELDS = Object.freeze({
    ...PUBLIC_HOTEL_FIELDS,
    ...MANAGER_ACCESS_FIELDS,
});

const HOTEL_WITH_REVIEW_NOTES_FIELDS = Object.freeze({
    ...PUBLIC_HOTEL_FIELDS,
    owner: { select: OWNER_SUMMARY_FIELDS },
    managers: {
        select: {
            userId: true,
            user: { select: OWNER_SUMMARY_FIELDS },
        },
        orderBy: { createdAt: "asc" },
    },
    reviewNotes: {
        select: PUBLIC_REVIEW_NOTE_FIELDS,
        orderBy: { createdAt: "desc" },
    },
});

const HOTEL_WITH_OWNER_FIELDS = Object.freeze({
    ...PUBLIC_HOTEL_FIELDS,
    owner: { select: OWNER_SUMMARY_FIELDS },
});

async function updateIfStatus(client, id, expectedStatus, data) {
    const { count } = await client.hotel.updateMany({
        where: { id, status: expectedStatus },
        data: { ...data, updatedAt: new Date() },
    });
    return count === 1;
}

export function createHotelRepository(getClient = getPrisma) {
    return Object.freeze({
        create(data, client = getClient()) {
            return client.hotel.create({ data, select: PUBLIC_HOTEL_FIELDS });
        },

        findById(id, client = getClient()) {
            return client.hotel.findUnique({
                where: { id },
                select: HOTEL_WITH_ACCESS_FIELDS,
            });
        },

        findByIdWithReviewNotes(id, client = getClient()) {
            return client.hotel.findUnique({
                where: { id },
                select: HOTEL_WITH_REVIEW_NOTES_FIELDS,
            });
        },

        listByManager(userId, client = getClient()) {
            return client.hotel.findMany({
                where: {
                    OR: [
                        { ownerUserId: userId },
                        { managers: { some: { userId } } },
                    ],
                },
                select: PUBLIC_HOTEL_FIELDS,
                orderBy: { createdAt: "desc" },
            });
        },

        listForReview({ status }, client = getClient()) {
            return client.hotel.findMany({
                where: status ? { status } : {},
                select: HOTEL_WITH_OWNER_FIELDS,
                orderBy: { updatedAt: "desc" },
                take: HOTEL_REVIEW_LIST_LIMIT,
            });
        },

        updateFieldsIfStatus(id, expectedStatus, data, client = getClient()) {
            return updateIfStatus(client, id, expectedStatus, data);
        },

        updateStatusIfCurrent(
            id,
            expectedStatus,
            nextStatus,
            client = getClient(),
        ) {
            return updateIfStatus(client, id, expectedStatus, {
                status: nextStatus,
            });
        },
    });
}

export const hotelRepository = createHotelRepository();
