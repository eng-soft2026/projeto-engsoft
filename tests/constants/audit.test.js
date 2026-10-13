import { describe, expect, it } from "vitest";
import {
    AUDIT_ACTIONS,
    AUDIT_ENTITY_TYPES,
    AUDIT_REASON_MAX_LENGTH,
    AUDIT_RESULTS,
} from "../../src/constants/audit.js";
import {
    readPrismaEnumValues,
    readPrismaSchema,
} from "../helpers/prisma-schema.js";

const SPEC_ACTIONS = [
    "CREATE",
    "UPDATE",
    "DELETE",
    "BLOCK",
    "APPROVE",
    "CANCEL",
    "REFUND",
    "PRICE_CHANGE",
    "AVAILABILITY_CHANGE",
    "REQUEST_CHANGES",
    "UNBLOCK",
    "HIDE_REVIEW",
    "RELOCATE",
];

describe("AUDIT_ACTIONS", () => {
    it("lists the auditable actions of doc 25 §25", () => {
        expect(Object.keys(AUDIT_ACTIONS).sort()).toEqual(
            [...SPEC_ACTIONS].sort(),
        );
    });

    it("maps every key to the same string", () => {
        for (const [key, value] of Object.entries(AUDIT_ACTIONS)) {
            expect(value).toBe(key);
        }
    });

    it("is frozen", () => {
        expect(Object.isFrozen(AUDIT_ACTIONS)).toBe(true);
    });
});

describe("AUDIT_ENTITY_TYPES", () => {
    it("includes the hotel", () => {
        expect(AUDIT_ENTITY_TYPES.HOTEL).toBe("HOTEL");
    });

    it("is frozen", () => {
        expect(Object.isFrozen(AUDIT_ENTITY_TYPES)).toBe(true);
    });
});

describe("AUDIT_REASON_MAX_LENGTH", () => {
    it("matches the size of the reason column in the Prisma schema", () => {
        const [, columnSize] = readPrismaSchema().match(
            /model AuditLog \{[^}]*?reason\s+String\?\s+@db\.VarChar\((\d+)\)/,
        );

        expect(Number(columnSize)).toBe(AUDIT_REASON_MAX_LENGTH);
    });
});

describe("AUDIT_RESULTS", () => {
    it("matches the AuditResult enum in the Prisma schema (doc 25 §25)", () => {
        expect(Object.values(AUDIT_RESULTS).sort()).toEqual(
            readPrismaEnumValues("AuditResult").sort(),
        );
    });

    it("is frozen", () => {
        expect(Object.isFrozen(AUDIT_RESULTS)).toBe(true);
    });
});
