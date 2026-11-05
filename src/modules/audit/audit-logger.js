import { isIP } from "node:net";
import {
    AUDIT_ACTIONS,
    AUDIT_ENTITY_TYPES,
    AUDIT_REASON_MAX_LENGTH,
    AUDIT_RESULTS,
} from "../../constants/audit.js";
import { ValidationError } from "../../lib/errors.js";
import { isValidRequestId } from "../../lib/request-id.js";
import { auditLogRepository as defaultAuditLogRepository } from "../../repositories/audit-log-repository.js";

const USER_AGENT_MAX_LENGTH = 255;
const IP_ADDRESS_MAX_LENGTH = 45;

export function normalizeAuditReason(reason) {
    const trimmedReason = typeof reason === "string" ? reason.trim() : "";
    if (trimmedReason === "") {
        throw new ValidationError("Informe o motivo da ação.");
    }
    if (trimmedReason.length > AUDIT_REASON_MAX_LENGTH) {
        throw new ValidationError(
            `O motivo deve ter no máximo ${AUDIT_REASON_MAX_LENGTH} caracteres.`,
        );
    }
    return trimmedReason;
}

function normalizeIpAddress(value) {
    const ipAddress = typeof value === "string" ? value.trim() : "";
    const isStorable =
        ipAddress.length <= IP_ADDRESS_MAX_LENGTH && isIP(ipAddress) !== 0;
    return isStorable ? ipAddress : null;
}

function normalizeRequestId(value) {
    return isValidRequestId(value) ? value : null;
}

function normalizeUserAgent(value) {
    if (typeof value !== "string" || value === "") {
        return null;
    }
    return value.slice(0, USER_AGENT_MAX_LENGTH);
}

function normalizeContext({ requestId, ipAddress, userAgent } = {}) {
    return {
        requestId: normalizeRequestId(requestId),
        ipAddress: normalizeIpAddress(ipAddress),
        userAgent: normalizeUserAgent(userAgent),
    };
}

function assertKnownValue(catalog, value, label) {
    if (!Object.values(catalog).includes(value)) {
        throw new TypeError(`Unknown ${label}: ${value}`);
    }
}

function assertValidTarget(admin, entityId) {
    if (!admin?.id) {
        throw new TypeError("An admin actor is required to audit this action.");
    }
    if (typeof entityId !== "string" || entityId === "") {
        throw new TypeError("An entity id is required to audit this action.");
    }
}

export function createAuditLogger({ auditLogRepository }) {
    async function recordAdminAction(
        {
            admin,
            action,
            entityType,
            entityId,
            beforeData,
            afterData,
            reason,
            context,
        },
        client,
    ) {
        assertKnownValue(AUDIT_ACTIONS, action, "audit action");
        assertKnownValue(AUDIT_ENTITY_TYPES, entityType, "audit entity type");
        assertValidTarget(admin, entityId);

        return auditLogRepository.create(
            {
                userId: admin.id,
                action,
                entityType,
                entityId,
                beforeData,
                afterData,
                reason: normalizeAuditReason(reason),
                result: AUDIT_RESULTS.SUCCESS,
                ...normalizeContext(context),
            },
            client,
        );
    }

    return Object.freeze({ recordAdminAction });
}

export const auditLogger = createAuditLogger({
    auditLogRepository: defaultAuditLogRepository,
});
