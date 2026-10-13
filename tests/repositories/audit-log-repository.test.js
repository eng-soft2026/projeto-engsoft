import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAuditLogRepository } from "../../src/repositories/audit-log-repository.js";

const ENTRY = Object.freeze({
    userId: "admin-1",
    action: "APPROVE",
    entityType: "HOTEL",
    entityId: "hotel-1",
    beforeData: { status: "UNDER_REVIEW" },
    afterData: { status: "PUBLISHED" },
    reason: "Documentos conferidos.",
    result: "SUCCESS",
    requestId: "req-1",
    ipAddress: "203.0.113.7",
    userAgent: "Mozilla/5.0",
});

function createFakePrisma() {
    return {
        auditLog: {
            create: vi.fn(async () => ({ id: "audit-1" })),
        },
    };
}

describe("auditLogRepository", () => {
    let prisma;
    let repository;

    beforeEach(() => {
        prisma = createFakePrisma();
        repository = createAuditLogRepository(() => prisma);
    });

    it("is append-only: the only operation is create (RN107, DT022)", () => {
        expect(Object.keys(repository)).toEqual(["create"]);
    });

    it("is frozen, so no update or delete can be attached at runtime", () => {
        expect(Object.isFrozen(repository)).toBe(true);
    });

    it("create stores the entry and returns only the id", async () => {
        await expect(repository.create(ENTRY)).resolves.toEqual({
            id: "audit-1",
        });

        expect(prisma.auditLog.create).toHaveBeenCalledWith({
            data: ENTRY,
            select: { id: true },
        });
    });

    it("omits absent JSON snapshots instead of sending null", async () => {
        await repository.create({
            ...ENTRY,
            beforeData: null,
            afterData: undefined,
        });

        const [{ data }] = prisma.auditLog.create.mock.calls[0];
        expect(data.beforeData).toBeUndefined();
        expect(data.afterData).toBeUndefined();
    });

    it("uses the transaction client when one is given", async () => {
        const getClient = vi.fn(() => prisma);
        const transactionClient = createFakePrisma();

        await createAuditLogRepository(getClient).create(
            ENTRY,
            transactionClient,
        );

        expect(transactionClient.auditLog.create).toHaveBeenCalledTimes(1);
        expect(getClient).not.toHaveBeenCalled();
    });

    it("resolves the client only when a method runs", () => {
        const getClient = vi.fn(() => prisma);

        createAuditLogRepository(getClient);

        expect(getClient).not.toHaveBeenCalled();
    });
});
