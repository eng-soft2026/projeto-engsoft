import { getPrisma } from "../lib/prisma.js";

export const PUBLIC_REVIEW_NOTE_FIELDS = Object.freeze({
    id: true,
    fromStatus: true,
    toStatus: true,
    notes: true,
    createdAt: true,
});

export function createHotelReviewNoteRepository(getClient = getPrisma) {
    return Object.freeze({
        create(
            { hotelId, adminUserId, fromStatus, toStatus, notes },
            client = getClient(),
        ) {
            return client.hotelReviewNote.create({
                data: { hotelId, adminUserId, fromStatus, toStatus, notes },
                select: PUBLIC_REVIEW_NOTE_FIELDS,
            });
        },
    });
}

export const hotelReviewNoteRepository = createHotelReviewNoteRepository();
