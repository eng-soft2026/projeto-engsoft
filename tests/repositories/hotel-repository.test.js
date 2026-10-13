import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    HOTEL_REVIEW_LIST_LIMIT,
    MANAGER_ACCESS_FIELDS,
    OWNER_SUMMARY_FIELDS,
    PUBLIC_HOTEL_FIELDS,
    createHotelRepository,
} from "../../src/repositories/hotel-repository.js";

function createFakePrisma() {
    return {
        hotel: {
            create: vi.fn(async () => ({ id: "hotel-1" })),
            findUnique: vi.fn(async () => null),
            findMany: vi.fn(async () => []),
            updateMany: vi.fn(async () => ({ count: 1 })),
        },
    };
}

describe("hotelRepository", () => {
    let prisma;
    let repository;

    beforeEach(() => {
        prisma = createFakePrisma();
        repository = createHotelRepository(() => prisma);
    });

    it("never exposes the owner CPF or password hash in the owner summary", () => {
        expect(Object.keys(OWNER_SUMMARY_FIELDS).sort()).toEqual([
            "email",
            "id",
            "name",
        ]);
    });

    it("create stores the data and returns only public fields", async () => {
        const data = { name: "Hotel Mar Azul", status: "DRAFT" };

        await repository.create(data);

        expect(prisma.hotel.create).toHaveBeenCalledWith({
            data,
            select: PUBLIC_HOTEL_FIELDS,
        });
    });

    it("findById selects the public fields and the additional manager ids", async () => {
        await repository.findById("hotel-1");

        expect(prisma.hotel.findUnique).toHaveBeenCalledWith({
            where: { id: "hotel-1" },
            select: { ...PUBLIC_HOTEL_FIELDS, ...MANAGER_ACCESS_FIELDS },
        });
        expect(MANAGER_ACCESS_FIELDS).toEqual({
            managers: { select: { userId: true } },
        });
    });

    it("findByIdWithReviewNotes lists the additional managers with id, name and e-mail only", async () => {
        await repository.findByIdWithReviewNotes("hotel-1");

        const { select } = prisma.hotel.findUnique.mock.calls[0][0];
        expect(select.managers).toEqual({
            select: { userId: true, user: { select: OWNER_SUMMARY_FIELDS } },
            orderBy: { createdAt: "asc" },
        });
    });

    it("findByIdWithReviewNotes returns the newest notes first without the admin id", async () => {
        await repository.findByIdWithReviewNotes("hotel-1");

        const [{ where, select }] = prisma.hotel.findUnique.mock.calls[0];
        expect(where).toEqual({ id: "hotel-1" });
        expect(select.reviewNotes.orderBy).toEqual({ createdAt: "desc" });
        expect(select.reviewNotes.select).not.toHaveProperty("adminUserId");
        expect(select.reviewNotes.select).toMatchObject({
            notes: true,
            fromStatus: true,
            toStatus: true,
        });
        expect(select.owner).toEqual({ select: OWNER_SUMMARY_FIELDS });
    });

    it("listByManager lists owned and additionally managed hotels, newest first", async () => {
        await repository.listByManager("manager-1");

        expect(prisma.hotel.findMany).toHaveBeenCalledWith({
            where: {
                OR: [
                    { ownerUserId: "manager-1" },
                    { managers: { some: { userId: "manager-1" } } },
                ],
            },
            select: PUBLIC_HOTEL_FIELDS,
            orderBy: { createdAt: "desc" },
        });
    });

    it("listForReview filters by status, includes the owner summary and caps the list", async () => {
        await repository.listForReview({ status: "UNDER_REVIEW" });

        const [query] = prisma.hotel.findMany.mock.calls[0];
        expect(query.where).toEqual({ status: "UNDER_REVIEW" });
        expect(query.select.owner).toEqual({ select: OWNER_SUMMARY_FIELDS });
        expect(query.orderBy).toEqual({ updatedAt: "desc" });
        expect(query.take).toBe(HOTEL_REVIEW_LIST_LIMIT);
        expect(HOTEL_REVIEW_LIST_LIMIT).toBe(100);
    });

    it("listForReview lists every status without a filter", async () => {
        await repository.listForReview({});

        const [query] = prisma.hotel.findMany.mock.calls[0];
        expect(query.where).toEqual({});
    });

    describe("updateStatusIfCurrent", () => {
        it("updates only while the hotel still has the expected status", async () => {
            await repository.updateStatusIfCurrent(
                "hotel-1",
                "UNDER_REVIEW",
                "PUBLISHED",
            );

            expect(prisma.hotel.updateMany).toHaveBeenCalledWith({
                where: { id: "hotel-1", status: "UNDER_REVIEW" },
                data: { status: "PUBLISHED", updatedAt: expect.any(Date) },
            });
        });

        it("returns true when one row was updated", async () => {
            await expect(
                repository.updateStatusIfCurrent(
                    "hotel-1",
                    "DRAFT",
                    "UNDER_REVIEW",
                ),
            ).resolves.toBe(true);
        });

        it("returns false when the status changed in the meantime", async () => {
            prisma.hotel.updateMany.mockResolvedValueOnce({ count: 0 });

            await expect(
                repository.updateStatusIfCurrent(
                    "hotel-1",
                    "DRAFT",
                    "UNDER_REVIEW",
                ),
            ).resolves.toBe(false);
        });
    });

    describe("updateFieldsIfStatus", () => {
        it("updates only while the hotel still has the expected status", async () => {
            await repository.updateFieldsIfStatus("hotel-1", "DRAFT", {
                name: "Novo nome",
            });

            expect(prisma.hotel.updateMany).toHaveBeenCalledWith({
                where: { id: "hotel-1", status: "DRAFT" },
                data: { name: "Novo nome", updatedAt: expect.any(Date) },
            });
        });

        it("returns false when the status changed in the meantime", async () => {
            prisma.hotel.updateMany.mockResolvedValueOnce({ count: 0 });

            await expect(
                repository.updateFieldsIfStatus("hotel-1", "DRAFT", {
                    name: "Novo nome",
                }),
            ).resolves.toBe(false);
        });
    });

    it("uses the transaction client when one is given", async () => {
        const getClient = vi.fn(() => prisma);
        const transactionClient = createFakePrisma();
        const transactional = createHotelRepository(getClient);

        await transactional.findById("hotel-1", transactionClient);
        await transactional.updateStatusIfCurrent(
            "hotel-1",
            "DRAFT",
            "UNDER_REVIEW",
            transactionClient,
        );

        expect(transactionClient.hotel.findUnique).toHaveBeenCalledTimes(1);
        expect(transactionClient.hotel.updateMany).toHaveBeenCalledTimes(1);
        expect(getClient).not.toHaveBeenCalled();
    });

    it("resolves the client only when a method runs", () => {
        const getClient = vi.fn(() => prisma);

        createHotelRepository(getClient);

        expect(getClient).not.toHaveBeenCalled();
    });
});
