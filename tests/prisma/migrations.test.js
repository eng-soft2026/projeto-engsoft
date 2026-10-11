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

describe("prisma migrations", () => {
    it("keeps the overbooking percentage CHECK between 0 and 10 (RN047, RN048)", () => {
        expect(readAllMigrationsSql()).toContain(
            "CHECK (`overbooking_percentage` BETWEEN 0 AND 10)",
        );
    });

    it("keeps the hotel acceptance uniqueness by hotel, type and custom label (RN113)", () => {
        expect(readAllMigrationsSql()).toMatch(
            /UNIQUE INDEX `\w+`\(`hotel_id`, `acceptance_type_id`, `custom_label`\)/,
        );
    });
});
