import { AuditResult } from "../generated/prisma/enums.ts";

export const AUDIT_ACTIONS = Object.freeze({
    CREATE: "CREATE",
    UPDATE: "UPDATE",
    DELETE: "DELETE",
    BLOCK: "BLOCK",
    APPROVE: "APPROVE",
    CANCEL: "CANCEL",
    REFUND: "REFUND",
    PRICE_CHANGE: "PRICE_CHANGE",
    AVAILABILITY_CHANGE: "AVAILABILITY_CHANGE",
    REQUEST_CHANGES: "REQUEST_CHANGES",
    UNBLOCK: "UNBLOCK",
    HIDE_REVIEW: "HIDE_REVIEW",
    RELOCATE: "RELOCATE",
});

export const AUDIT_ENTITY_TYPES = Object.freeze({
    HOTEL: "HOTEL",
});

export const AUDIT_REASON_MAX_LENGTH = 1000;

export const AUDIT_RESULTS = Object.freeze({ ...AuditResult });
