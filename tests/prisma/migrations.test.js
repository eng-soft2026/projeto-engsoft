import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = join(import.meta.dirname, "../../prisma/migrations");

function readAllMigrationsSql() {
    return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => join(MIGRATIONS_DIR, entry.name, "migration.sql"))
        .filter((path) => existsSync(path))
        .map((path) => readFileSync(path, "utf8"))
        .join("\n");
}

const AUDIT_LOG_TABLE_PATTERN = /CREATE TABLE `audit_log` \(([\s\S]*?)\n\) /;

function readAuditLogTableBody() {
    const [, body] = readAllMigrationsSql().match(AUDIT_LOG_TABLE_PATTERN);
    return body;
}

describe("prisma migrations", () => {
    it("keeps the overbooking percentage CHECK between 0 and 10 (RN047, RN048)", () => {
        expect(readAllMigrationsSql()).toContain(
            "CHECK (`overbooking_percentage` BETWEEN 0 AND 10)",
        );
    });

    it("lets the address coordinates be NULL until the geocoding exists (RN088)", () => {
        const sql = readAllMigrationsSql();

        expect(sql).toContain("MODIFY `latitude` DECIMAL(9, 6) NULL");
        expect(sql).toContain("MODIFY `longitude` DECIMAL(9, 6) NULL");
    });

    it("keeps the hotel acceptance uniqueness by hotel, type and custom label (RN113)", () => {
        expect(readAllMigrationsSql()).toMatch(
            /UNIQUE INDEX `\w+`\(`hotel_id`, `acceptance_type_id`, `custom_label`\)/,
        );
    });

    it("stores the audit log snapshots as JSON (doc 25 §25)", () => {
        const body = readAuditLogTableBody();

        expect(body).toContain("`before_data` JSON NULL");
        expect(body).toContain("`after_data` JSON NULL");
    });

    it("keeps audit log rows immutable by design: no updated_at column (RN107)", () => {
        const body = readAuditLogTableBody();

        expect(body).toContain("`created_at`");
        expect(body).not.toContain("`updated_at`");
    });

    it("keeps the audit log actor as a RESTRICT foreign key to user (doc 25 §2 and §28)", () => {
        expect(readAllMigrationsSql()).toMatch(
            /ALTER TABLE `audit_log` ADD CONSTRAINT `\w+` FOREIGN KEY \(`user_id`\) REFERENCES `user`\(`id`\) ON DELETE RESTRICT/,
        );
    });

    it("indexes the audit log by entity and by actor (doc 14 queries)", () => {
        const body = readAuditLogTableBody();

        expect(body).toMatch(
            /INDEX `\w+`\(`entity_type`, `entity_id`, `created_at`\)/,
        );
        expect(body).toMatch(/INDEX `\w+`\(`user_id`, `created_at`\)/);
    });
});
