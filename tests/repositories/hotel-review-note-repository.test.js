import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    PUBLIC_REVIEW_NOTE_FIELDS,
    createHotelReviewNoteRepository,
} from "../../src/repositories/hotel-review-note-repository.js";

const NOTE = Object.freeze({
    hotelId: "hotel-1",
    adminUserId: "admin-1",
    fromStatus: "UNDER_REVIEW",
    toStatus: "DRAFT",
    notes: "Corrigir o CNPJ.",
});

function createFakePrisma() {
    return {
        hotelReviewNote: {
            create: vi.fn(async () => ({ id: "note-1" })),
        },
    };
}

describe("hotelReviewNoteRepository", () => {
    let prisma;
    let repository;

    beforeEach(() => {
        prisma = createFakePrisma();
        repository = createHotelReviewNoteRepository(() => prisma);
    });

    it("never selects the admin user id", () => {
        expect(PUBLIC_REVIEW_NOTE_FIELDS).not.toHaveProperty("adminUserId");
    });

    it("create stores the transition and the notes (doc 25 §4)", async () => {
        await repository.create(NOTE);

        expect(prisma.hotelReviewNote.create).toHaveBeenCalledWith({
            data: NOTE,
            select: PUBLIC_REVIEW_NOTE_FIELDS,
        });
    });

    it("create ignores fields outside the note", async () => {
        await repository.create({ ...NOTE, id: "forced-id", createdAt: "x" });

        const [{ data }] = prisma.hotelReviewNote.create.mock.calls[0];
        expect(data).toEqual(NOTE);
    });

    it("uses the transaction client when one is given", async () => {
        const getClient = vi.fn(() => prisma);
        const transactionClient = createFakePrisma();

        await createHotelReviewNoteRepository(getClient).create(
            NOTE,
            transactionClient,
        );

        expect(transactionClient.hotelReviewNote.create).toHaveBeenCalledTimes(
            1,
        );
        expect(getClient).not.toHaveBeenCalled();
    });

    it("resolves the client only when a method runs", () => {
        const getClient = vi.fn(() => prisma);

        createHotelReviewNoteRepository(getClient);

        expect(getClient).not.toHaveBeenCalled();
    });
});
