import { beforeEach, describe, expect, it } from "vitest";
import {
    AUDIT_ACTIONS,
    AUDIT_ENTITY_TYPES,
} from "../../src/constants/audit.js";
import { HOTEL_STATUSES } from "../../src/constants/hotel-statuses.js";
import { USER_ROLES } from "../../src/constants/user-roles.js";
import { getPrisma } from "../../src/lib/prisma.js";
import { transactionRunner } from "../../src/lib/transaction.js";
import { createAuditLogger } from "../../src/modules/audit/audit-logger.js";
import { noopHotelEventPublisher } from "../../src/modules/hotels/hotel-events.js";
import { auditLogRepository } from "../../src/repositories/audit-log-repository.js";
import { hotelRepository } from "../../src/repositories/hotel-repository.js";
import { hotelReviewNoteRepository } from "../../src/repositories/hotel-review-note-repository.js";
import { hotelManagerService } from "../../src/services/hotel-manager-service.js";
import {
    createHotelService,
    hotelService,
} from "../../src/services/hotel-service.js";
import { resetDatabase, seedBaseData } from "./helpers/database.js";
import {
    createAdmin,
    createDraftHotel,
    createManager,
    createUser,
} from "./helpers/fixtures.js";
import { flushRedis } from "./helpers/redis.js";

const REQUEST_CONTEXT = Object.freeze({
    requestId: "integration-request-1",
    ipAddress: "203.0.113.10",
    userAgent: "vitest-integration",
});

const PAST_DATE = new Date("2020-01-01T00:00:00.000Z");

function findStoredHotel(id) {
    return getPrisma().hotel.findUnique({ where: { id } });
}

function listAuditRows(hotelId) {
    return getPrisma().auditLog.findMany({
        where: { entityType: AUDIT_ENTITY_TYPES.HOTEL, entityId: hotelId },
        orderBy: { createdAt: "asc" },
    });
}

function listReviewNotes(hotelId) {
    return getPrisma().hotelReviewNote.findMany({
        where: { hotelId },
        orderBy: { createdAt: "asc" },
    });
}

async function rewindUpdatedAt(hotelId) {
    await getPrisma().hotel.update({
        where: { id: hotelId },
        data: { updatedAt: PAST_DATE },
    });
}

async function expectUpdatedAtAdvanced(hotelId) {
    const stored = await findStoredHotel(hotelId);
    expect(stored.updatedAt.getTime()).toBeGreaterThan(PAST_DATE.getTime());
}

async function createHotelUnderReview(owner) {
    const hotel = await createDraftHotel(owner);
    await hotelService.submitForReview(owner, hotel.id);
    return hotel;
}

function createHotelServiceWithFailingAudit() {
    const failingAuditLogger = createAuditLogger({
        auditLogRepository: {
            create: () => Promise.reject(new Error("audit insert failed")),
        },
    });
    return createHotelService({
        hotelRepository,
        hotelReviewNoteRepository,
        auditLogger: failingAuditLogger,
        transactionRunner,
        hotelEvents: noopHotelEventPublisher,
    });
}

describe("hotel lifecycle against MySQL", () => {
    let owner;
    let admin;

    beforeEach(async () => {
        await resetDatabase();
        await seedBaseData();
        await flushRedis();
        owner = await createManager();
        admin = await createAdmin();
    });

    it("creates a draft hotel with the normalized CNPJ", async () => {
        const hotel = await createDraftHotel(owner, {
            cnpj: "11.222.333/0001-81",
        });

        const stored = await findStoredHotel(hotel.id);
        expect(stored).toMatchObject({
            ownerUserId: owner.id,
            status: HOTEL_STATUSES.DRAFT,
            cnpj: "11222333000181",
        });
    });

    it("submits and approves a hotel with one audit row and no review note", async () => {
        const hotel = await createDraftHotel(owner);
        await rewindUpdatedAt(hotel.id);

        await hotelService.submitForReview(owner, hotel.id);
        await expectUpdatedAtAdvanced(hotel.id);
        await rewindUpdatedAt(hotel.id);

        const approved = await hotelService.approveHotel(
            admin,
            hotel.id,
            { reason: "Cadastro completo." },
            REQUEST_CONTEXT,
        );

        expect(approved.status).toBe(HOTEL_STATUSES.PUBLISHED);
        await expectUpdatedAtAdvanced(hotel.id);
        const auditRows = await listAuditRows(hotel.id);
        expect(auditRows).toHaveLength(1);
        expect(auditRows[0]).toMatchObject({
            userId: admin.id,
            action: AUDIT_ACTIONS.APPROVE,
            beforeData: { status: HOTEL_STATUSES.UNDER_REVIEW },
            afterData: { status: HOTEL_STATUSES.PUBLISHED },
            reason: "Cadastro completo.",
            result: "SUCCESS",
            ...REQUEST_CONTEXT,
        });
        await expect(listReviewNotes(hotel.id)).resolves.toHaveLength(0);
    });

    it("records a review note when the admin requests changes", async () => {
        const hotel = await createHotelUnderReview(owner);
        await rewindUpdatedAt(hotel.id);

        const updated = await hotelService.requestHotelChanges(
            admin,
            hotel.id,
            { reason: "  Envie fotos da fachada.  " },
            REQUEST_CONTEXT,
        );

        expect(updated.status).toBe(HOTEL_STATUSES.DRAFT);
        await expectUpdatedAtAdvanced(hotel.id);
        const [note] = await listReviewNotes(hotel.id);
        expect(note).toMatchObject({
            adminUserId: admin.id,
            fromStatus: HOTEL_STATUSES.UNDER_REVIEW,
            toStatus: HOTEL_STATUSES.DRAFT,
            notes: "Envie fotos da fachada.",
        });
        const [auditRow] = await listAuditRows(hotel.id);
        expect(auditRow.action).toBe(AUDIT_ACTIONS.REQUEST_CHANGES);
    });

    it("blocks a published hotel and unblocks it back to DRAFT", async () => {
        const hotel = await createHotelUnderReview(owner);
        await hotelService.approveHotel(admin, hotel.id, { reason: "Ok." });
        await rewindUpdatedAt(hotel.id);

        const blocked = await hotelService.blockHotel(admin, hotel.id, {
            reason: "Denúncia de fraude.",
        });
        expect(blocked.status).toBe(HOTEL_STATUSES.BLOCKED);
        await expectUpdatedAtAdvanced(hotel.id);
        await rewindUpdatedAt(hotel.id);

        const unblocked = await hotelService.unblockHotel(admin, hotel.id, {
            reason: "Ajustar o cadastro.",
            targetStatus: HOTEL_STATUSES.DRAFT,
        });
        expect(unblocked.status).toBe(HOTEL_STATUSES.DRAFT);
        await expectUpdatedAtAdvanced(hotel.id);

        const notes = await listReviewNotes(hotel.id);
        expect(
            notes.map(({ fromStatus, toStatus }) => [fromStatus, toStatus]),
        ).toEqual([
            [HOTEL_STATUSES.PUBLISHED, HOTEL_STATUSES.BLOCKED],
            [HOTEL_STATUSES.BLOCKED, HOTEL_STATUSES.DRAFT],
        ]);
        const auditRows = await listAuditRows(hotel.id);
        expect(auditRows.map(({ action }) => action)).toEqual([
            AUDIT_ACTIONS.APPROVE,
            AUDIT_ACTIONS.BLOCK,
            AUDIT_ACTIONS.UNBLOCK,
        ]);
    });

    it("rolls back the status and the review note when the audit insert fails", async () => {
        const hotel = await createHotelUnderReview(owner);
        const failingService = createHotelServiceWithFailingAudit();

        await expect(
            failingService.requestHotelChanges(admin, hotel.id, {
                reason: "Envie fotos.",
            }),
        ).rejects.toThrow("audit insert failed");

        const stored = await findStoredHotel(hotel.id);
        expect(stored.status).toBe(HOTEL_STATUSES.UNDER_REVIEW);
        await expect(listReviewNotes(hotel.id)).resolves.toHaveLength(0);
        await expect(listAuditRows(hotel.id)).resolves.toHaveLength(0);
    });

    it("lets only one of two parallel approvals commit", async () => {
        const hotel = await createHotelUnderReview(owner);

        const results = await Promise.allSettled([
            hotelService.approveHotel(admin, hotel.id, { reason: "A." }),
            hotelService.approveHotel(admin, hotel.id, { reason: "B." }),
        ]);

        const fulfilled = results.filter(
            ({ status }) => status === "fulfilled",
        );
        const rejected = results.filter(({ status }) => status === "rejected");
        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(1);
        expect(rejected[0].reason.code).toBe("INVALID_HOTEL_STATUS");
        await expect(listAuditRows(hotel.id)).resolves.toHaveLength(1);
    });

    it("refuses to edit a hotel outside DRAFT", async () => {
        const hotel = await createHotelUnderReview(owner);

        await expect(
            hotelService.updateHotel(owner, hotel.id, { name: "Outro nome" }),
        ).rejects.toMatchObject({ code: "INVALID_HOTEL_STATUS" });
        const stored = await findStoredHotel(hotel.id);
        expect(stored.name).toBe(hotel.name);
    });

    it("keeps the audit log append-only", async () => {
        const hotel = await createHotelUnderReview(owner);
        await hotelService.approveHotel(admin, hotel.id, { reason: "Ok." });
        await hotelService.blockHotel(admin, hotel.id, { reason: "Fraude." });

        expect(Object.keys(auditLogRepository)).toEqual(["create"]);
        const rows = await listAuditRows(hotel.id);
        expect(rows).toHaveLength(2);
        expect(rows[0]).toMatchObject({
            action: AUDIT_ACTIONS.APPROVE,
            afterData: { status: HOTEL_STATUSES.PUBLISHED },
        });
    });
});

describe("additional hotel managers against MySQL", () => {
    let owner;
    let coManager;
    let hotel;

    beforeEach(async () => {
        await resetDatabase();
        await seedBaseData();
        await flushRedis();
        owner = await createManager();
        coManager = await createManager();
        hotel = await createDraftHotel(owner);
    });

    function listManagerRows() {
        return getPrisma().hotelManager.findMany({
            where: { hotelId: hotel.id },
        });
    }

    it("adds a manager by e-mail who then manages the hotel", async () => {
        const added = await hotelManagerService.addManager(owner, hotel.id, {
            email: coManager.email,
        });

        expect(added).toEqual({
            id: coManager.id,
            name: coManager.name,
            email: coManager.email,
        });
        await expect(listManagerRows()).resolves.toHaveLength(1);
        const managed = await hotelService.listManagedHotels(coManager);
        expect(managed.map(({ id }) => id)).toEqual([hotel.id]);
        const updated = await hotelService.updateHotel(coManager, hotel.id, {
            name: "Hotel Coadministrado",
        });
        expect(updated).not.toHaveProperty("managers");
        expect(updated.name).toBe("Hotel Coadministrado");
    });

    it("shows the manager list only to the owner", async () => {
        await hotelManagerService.addManager(owner, hotel.id, {
            email: coManager.email,
        });

        const ownerView = await hotelService.getHotel(owner, hotel.id);
        const coManagerView = await hotelService.getHotel(coManager, hotel.id);

        expect(ownerView.managers).toEqual([
            { id: coManager.id, name: coManager.name, email: coManager.email },
        ]);
        expect(coManagerView).not.toHaveProperty("managers");
    });

    it("refuses a duplicate, the owner and a non-manager user", async () => {
        const customer = await createUser({ role: USER_ROLES.CUSTOMER });
        await hotelManagerService.addManager(owner, hotel.id, {
            email: coManager.email,
        });

        await expect(
            hotelManagerService.addManager(owner, hotel.id, {
                email: coManager.email,
            }),
        ).rejects.toMatchObject({ code: "HOTEL_MANAGER_ALREADY_EXISTS" });
        await expect(
            hotelManagerService.addManager(owner, hotel.id, {
                email: owner.email,
            }),
        ).rejects.toMatchObject({ code: "HOTEL_MANAGER_ALREADY_EXISTS" });
        await expect(
            hotelManagerService.addManager(owner, hotel.id, {
                email: customer.email,
            }),
        ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
        await expect(
            hotelManagerService.addManager(owner, hotel.id, {
                email: "missing@example.com",
            }),
        ).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
        await expect(listManagerRows()).resolves.toHaveLength(1);
    });

    it("lets only the owner add or remove managers", async () => {
        const third = await createManager();
        await hotelManagerService.addManager(owner, hotel.id, {
            email: coManager.email,
        });

        await expect(
            hotelManagerService.addManager(coManager, hotel.id, {
                email: third.email,
            }),
        ).rejects.toMatchObject({ code: "HOTEL_NOT_FOUND" });
        await expect(
            hotelManagerService.removeManager(
                coManager,
                hotel.id,
                coManager.id,
            ),
        ).rejects.toMatchObject({ code: "HOTEL_NOT_FOUND" });
    });

    it("removes a manager, who then loses access", async () => {
        await hotelManagerService.addManager(owner, hotel.id, {
            email: coManager.email,
        });

        await hotelManagerService.removeManager(owner, hotel.id, coManager.id);

        await expect(listManagerRows()).resolves.toHaveLength(0);
        await expect(
            hotelService.updateHotel(coManager, hotel.id, { name: "Outro" }),
        ).rejects.toMatchObject({ code: "HOTEL_NOT_FOUND" });
        await expect(
            hotelManagerService.removeManager(owner, hotel.id, coManager.id),
        ).rejects.toMatchObject({ code: "HOTEL_MANAGER_NOT_FOUND" });
    });
});
