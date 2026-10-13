import { getPrisma } from "../lib/prisma.js";

function toCreateData({ beforeData, afterData, ...entry }) {
    return {
        ...entry,
        beforeData: beforeData ?? undefined,
        afterData: afterData ?? undefined,
    };
}

export function createAuditLogRepository(getClient = getPrisma) {
    return Object.freeze({
        create(entry, client = getClient()) {
            return client.auditLog.create({
                data: toCreateData(entry),
                select: { id: true },
            });
        },
    });
}

export const auditLogRepository = createAuditLogRepository();
