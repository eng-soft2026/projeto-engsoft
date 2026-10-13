import { beforeEach, describe, expect, it, vi } from "vitest";
import { ValidationError } from "../../../src/lib/errors.js";
import {
    createAuditLogger,
    normalizeAuditReason,
} from "../../../src/modules/audit/audit-logger.js";

const ADMIN = Object.freeze({ id: "admin-1", role: "ADMIN" });

const ACTION = Object.freeze({
    admin: ADMIN,
    action: "APPROVE",
    entityType: "HOTEL",
    entityId: "hotel-1",
    beforeData: { status: "UNDER_REVIEW" },
    afterData: { status: "PUBLISHED" },
    reason: "Documentos conferidos.",
});

describe("normalizeAuditReason", () => {
    it("trims the reason", () => {
        expect(normalizeAuditReason("  Documentos conferidos.  ")).toBe(
            "Documentos conferidos.",
        );
    });

    it.each([undefined, null, "", "   ", 42, {}])(
        "rejects the missing reason %j (RN108)",
        (reason) => {
            expect(() => normalizeAuditReason(reason)).toThrow(ValidationError);
            expect(() => normalizeAuditReason(reason)).toThrow(
                "Informe o motivo da ação.",
            );
        },
    );

    it("accepts a reason of exactly 1000 characters", () => {
        const reason = "m".repeat(1000);

        expect(normalizeAuditReason(reason)).toBe(reason);
    });

    it("rejects a reason longer than the audit column", () => {
        expect(() => normalizeAuditReason("m".repeat(1001))).toThrow(
            "O motivo deve ter no máximo 1000 caracteres.",
        );
    });
});

describe("auditLogger.recordAdminAction", () => {
    let auditLogRepository;
    let auditLogger;

    beforeEach(() => {
        auditLogRepository = {
            create: vi.fn(async () => ({ id: "audit-1" })),
        };
        auditLogger = createAuditLogger({ auditLogRepository });
    });

    it("records who did what, to which entity, with the snapshots and the reason", async () => {
        await auditLogger.recordAdminAction(ACTION);

        expect(auditLogRepository.create).toHaveBeenCalledWith(
            {
                userId: "admin-1",
                action: "APPROVE",
                entityType: "HOTEL",
                entityId: "hotel-1",
                beforeData: { status: "UNDER_REVIEW" },
                afterData: { status: "PUBLISHED" },
                reason: "Documentos conferidos.",
                result: "SUCCESS",
                requestId: null,
                ipAddress: null,
                userAgent: null,
            },
            undefined,
        );
    });

    it("passes the transaction client to the repository", async () => {
        const transactionClient = { id: "transaction-client" };

        await auditLogger.recordAdminAction(ACTION, transactionClient);

        expect(auditLogRepository.create).toHaveBeenCalledWith(
            expect.any(Object),
            transactionClient,
        );
    });

    it("returns what the repository returns", async () => {
        await expect(auditLogger.recordAdminAction(ACTION)).resolves.toEqual({
            id: "audit-1",
        });
    });

    it("trims the reason before storing it", async () => {
        await auditLogger.recordAdminAction({
            ...ACTION,
            reason: "  Documentos conferidos.  ",
        });

        const [entry] = auditLogRepository.create.mock.calls[0];
        expect(entry.reason).toBe("Documentos conferidos.");
    });

    it.each([undefined, "", "   "])(
        "refuses to record an admin action with the reason %j and writes nothing (RN108)",
        async (reason) => {
            await expect(
                auditLogger.recordAdminAction({ ...ACTION, reason }),
            ).rejects.toThrow(ValidationError);

            expect(auditLogRepository.create).not.toHaveBeenCalled();
        },
    );

    it("lets a repository failure reach the caller, so the transaction rolls back", async () => {
        const failure = new Error("insert failed");
        auditLogRepository.create.mockRejectedValueOnce(failure);

        await expect(auditLogger.recordAdminAction(ACTION)).rejects.toBe(
            failure,
        );
    });

    it("rejects an unknown action", async () => {
        await expect(
            auditLogger.recordAdminAction({ ...ACTION, action: "EXPLODE" }),
        ).rejects.toThrow("Unknown audit action: EXPLODE");

        expect(auditLogRepository.create).not.toHaveBeenCalled();
    });

    it("rejects an unknown entity type", async () => {
        await expect(
            auditLogger.recordAdminAction({ ...ACTION, entityType: "PLANET" }),
        ).rejects.toThrow("Unknown audit entity type: PLANET");
    });

    it("requires an actor with an id", async () => {
        await expect(
            auditLogger.recordAdminAction({ ...ACTION, admin: undefined }),
        ).rejects.toThrow("An admin actor is required");
    });

    it.each([undefined, ""])(
        "requires an entity id, not %j",
        async (entityId) => {
            await expect(
                auditLogger.recordAdminAction({ ...ACTION, entityId }),
            ).rejects.toThrow("An entity id is required");
        },
    );

    it("exposes only recordAdminAction and is frozen", () => {
        expect(Object.keys(auditLogger)).toEqual(["recordAdminAction"]);
        expect(Object.isFrozen(auditLogger)).toBe(true);
    });

    describe("request context", () => {
        async function recordWithContext(context) {
            await auditLogger.recordAdminAction({ ...ACTION, context });
            const [entry] = auditLogRepository.create.mock.calls[0];
            return entry;
        }

        it("stores a valid request id, IP address and user agent", async () => {
            const entry = await recordWithContext({
                requestId: "req-123.abc:9",
                ipAddress: "203.0.113.7",
                userAgent: "Mozilla/5.0",
            });

            expect(entry).toMatchObject({
                requestId: "req-123.abc:9",
                ipAddress: "203.0.113.7",
                userAgent: "Mozilla/5.0",
            });
        });

        it("accepts an IPv6 address", async () => {
            const entry = await recordWithContext({
                ipAddress: "2001:db8::8a2e:370:7334",
            });

            expect(entry.ipAddress).toBe("2001:db8::8a2e:370:7334");
        });

        it.each(["not-an-ip", "999.1.1.1", "", "   ", null, 42])(
            "drops the invalid IP address %j",
            async (ipAddress) => {
                const entry = await recordWithContext({ ipAddress });

                expect(entry.ipAddress).toBeNull();
            },
        );

        it("drops an address that would not fit in the column", async () => {
            const entry = await recordWithContext({
                ipAddress: `fe80::1%${"e".repeat(40)}`,
            });

            expect(entry.ipAddress).toBeNull();
        });

        it("truncates the user agent to the column size", async () => {
            const entry = await recordWithContext({
                userAgent: "u".repeat(400),
            });

            expect(entry.userAgent).toBe("u".repeat(255));
        });

        it.each(["", null, undefined, 42])(
            "stores no user agent for %j",
            async (userAgent) => {
                const entry = await recordWithContext({ userAgent });

                expect(entry.userAgent).toBeNull();
            },
        );

        it.each(["has space", "semi;colon", "a".repeat(65), "", null, 42])(
            "drops the invalid request id %j",
            async (requestId) => {
                const entry = await recordWithContext({ requestId });

                expect(entry.requestId).toBeNull();
            },
        );

        it("keeps a request id of exactly 64 characters", async () => {
            const entry = await recordWithContext({
                requestId: "a".repeat(64),
            });

            expect(entry.requestId).toBe("a".repeat(64));
        });
    });
});
