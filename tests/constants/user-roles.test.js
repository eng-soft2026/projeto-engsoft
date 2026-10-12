import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
    SELF_REGISTRATION_ROLES,
    USER_ROLES,
} from "../../src/constants/user-roles.js";

const SCHEMA_PATH = join(import.meta.dirname, "../../prisma/schema.prisma");

function readUserRoleEnumValues() {
    const schema = readFileSync(SCHEMA_PATH, "utf8");
    const [, body] = schema.match(/enum UserRole \{([^}]*)\}/);
    return body.split(/\s+/).filter(Boolean);
}

describe("USER_ROLES", () => {
    it("matches the UserRole enum in the Prisma schema (doc 25 §3)", () => {
        expect(Object.values(USER_ROLES).sort()).toEqual(
            readUserRoleEnumValues().sort(),
        );
    });

    it("is frozen", () => {
        expect(Object.isFrozen(USER_ROLES)).toBe(true);
    });
});

describe("SELF_REGISTRATION_ROLES", () => {
    it("allows only CUSTOMER and MANAGER", () => {
        expect(SELF_REGISTRATION_ROLES).toEqual(["CUSTOMER", "MANAGER"]);
    });

    it("never allows ADMIN", () => {
        expect(SELF_REGISTRATION_ROLES).not.toContain(USER_ROLES.ADMIN);
    });
});
