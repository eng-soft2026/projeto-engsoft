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

    it("keeps the room number unique inside the unit (RN008)", () => {
        expect(readAllMigrationsSql()).toMatch(
            /UNIQUE INDEX `\w+`\(`unit_id`, `number`\)/,
        );
    });

    it("keeps one bed configuration per bed type in a room type", () => {
        expect(readAllMigrationsSql()).toMatch(
            /UNIQUE INDEX `\w+`\(`room_type_id`, `bed_type`\)/,
        );
    });

    it("keeps money as DECIMAL(10, 2), never a float (DT020)", () => {
        const sql = readAllMigrationsSql();

        expect(sql).toContain("`default_price` DECIMAL(10, 2) NOT NULL");
        expect(sql).toMatch(
            /CREATE TABLE `room_price_history`[\s\S]*?`price` DECIMAL\(10, 2\) NOT NULL/,
        );
    });

    it("keeps the hand-written CHECKs of room types, rooms and prices", () => {
        const sql = readAllMigrationsSql();

        expect(sql).toContain("CHECK (`default_price` > 0)");
        expect(sql).toContain("CHECK (`price` > 0)");
        expect(sql).toContain("CHECK (`max_guests` >= 1)");
        expect(sql).toContain("CHECK (`area_m2` > 0)");
        expect(sql).toContain("CHECK (`quantity` >= 1)");
        expect(sql).toContain(
            "CHECK (`valid_until` IS NULL OR `valid_until` >= `valid_from`)",
        );
    });

    it("ties the INACTIVE room status to is_active = 0", () => {
        expect(readAllMigrationsSql()).toContain(
            "CHECK ((`status` = 'INACTIVE' AND `is_active` = 0) OR (`status` <> 'INACTIVE' AND `is_active` = 1))",
        );
    });

    it("keeps every room foreign key as RESTRICT (RN011)", () => {
        const sql = readAllMigrationsSql();
        const foreignKeys = sql.match(
            /ALTER TABLE `(room|room_type|bed_configuration|room_type_history|room_price_history)` ADD CONSTRAINT[^;]*;/g,
        );

        expect(foreignKeys.length).toBeGreaterThanOrEqual(7);
        for (const statement of foreignKeys.filter((s) =>
            s.includes("FOREIGN KEY"),
        )) {
            expect(statement).toContain("ON DELETE RESTRICT");
        }
    });

    it("keeps the hotel acceptance uniqueness by hotel, type and custom label (RN113)", () => {
        expect(readAllMigrationsSql()).toMatch(
            /UNIQUE INDEX `\w+`\(`hotel_id`, `acceptance_type_id`, `custom_label`\)/,
        );
    });

    it("blocks a duplicated amenity pair with a composite primary key (doc 25 §11)", () => {
        const sql = readAllMigrationsSql();

        for (const [table, owner] of [
            ["hotel_amenity", "hotel_id"],
            ["unit_amenity", "unit_id"],
            ["room_type_amenity", "room_type_id"],
            ["room_amenity", "room_id"],
        ]) {
            const [, body] = sql.match(
                new RegExp(String.raw`CREATE TABLE \`${table}\` \(([\s\S]*?)
\) `),
            );

            expect(body).toContain(
                `PRIMARY KEY (\`${owner}\`, \`amenity_id\`)`,
            );
        }
    });

    it("keeps the amenity foreign keys as RESTRICT and the name unique per creator (RN011)", () => {
        const sql = readAllMigrationsSql();
        const foreignKeys = sql.match(
            /ALTER TABLE `(amenity|hotel_amenity|unit_amenity|room_type_amenity|room_amenity)` ADD CONSTRAINT[^;]*;/g,
        );

        expect(foreignKeys).toHaveLength(9);
        for (const statement of foreignKeys) {
            expect(statement).toContain("ON DELETE RESTRICT");
        }
        expect(sql).toMatch(
            /UNIQUE INDEX `\w+`\(`created_by_user_id`, `name`\)/,
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

    it("stores only the hash of a password reset token, unique (RF004)", () => {
        const [, body] = readAllMigrationsSql().match(
            /CREATE TABLE `password_reset_token` \(([\s\S]*?)\n\) /,
        );

        expect(body).toContain("`token_hash` CHAR(64) NOT NULL");
        expect(body).toContain("`expires_at` DATETIME(3) NOT NULL");
        expect(body).toContain("`used_at` DATETIME(3) NULL");
        expect(body).not.toMatch(/`token`/);
        expect(body).toMatch(/UNIQUE INDEX `\w+`\(`token_hash`\)/);
        expect(body).toMatch(/INDEX `\w+`\(`user_id`, `used_at`\)/);
    });

    it("keeps the password reset token owner as a RESTRICT foreign key to user", () => {
        expect(readAllMigrationsSql()).toMatch(
            /ALTER TABLE `password_reset_token` ADD CONSTRAINT `\w+` FOREIGN KEY \(`user_id`\) REFERENCES `user`\(`id`\) ON DELETE RESTRICT/,
        );
    });

    it("stores a room price period with DATE bounds and a DECIMAL(10, 2) price (doc 25 §10, DT020)", () => {
        const [, body] = readAllMigrationsSql().match(
            /CREATE TABLE `room_price_period` \(([\s\S]*?)\n\) /,
        );

        expect(body).toContain("`room_id` CHAR(36) NOT NULL");
        expect(body).toContain("`start_date` DATE NOT NULL");
        expect(body).toContain("`end_date` DATE NOT NULL");
        expect(body).toContain("`price` DECIMAL(10, 2) NOT NULL");
        expect(body).toContain("`updated_at` DATETIME(3) NOT NULL");
        expect(body).toMatch(
            /INDEX `\w+`\(`room_id`, `start_date`, `end_date`\)/,
        );
    });

    it("keeps the room price period CHECKs for a positive price and ordered dates (RN025)", () => {
        const sql = readAllMigrationsSql();

        expect(sql).toMatch(
            /ALTER TABLE `room_price_period` ADD CONSTRAINT `\w+` CHECK \(`price` > 0\)/,
        );
        expect(sql).toMatch(
            /ALTER TABLE `room_price_period` ADD CONSTRAINT `\w+` CHECK \(`start_date` <= `end_date`\)/,
        );
    });

    it("keeps the room price period room as a RESTRICT foreign key (RN011)", () => {
        expect(readAllMigrationsSql()).toMatch(
            /ALTER TABLE `room_price_period` ADD CONSTRAINT `\w+` FOREIGN KEY \(`room_id`\) REFERENCES `room`\(`id`\) ON DELETE RESTRICT/,
        );
    });

    describe.each([
        {
            table: "hotel_image",
            owner: "hotel_id",
            parent: "hotel",
            hasCover: true,
        },
        {
            table: "unit_image",
            owner: "unit_id",
            parent: "hotel_unit",
            hasCover: true,
        },
        {
            table: "room_type_image",
            owner: "room_type_id",
            parent: "room_type",
            hasCover: false,
        },
    ])("$table (doc 25 §12)", ({ table, owner, parent, hasCover }) => {
        function readImageTableBody() {
            const sql = readAllMigrationsSql();
            const start = sql.indexOf(`CREATE TABLE \`${table}\` (`);
            expect(start).toBeGreaterThan(-1);
            return sql.slice(start, sql.indexOf("\n) ", start));
        }

        it("stores only the Cloudinary metadata, never the file (RNF029)", () => {
            const body = readImageTableBody();

            expect(body).toContain(`\`${owner}\` CHAR(36) NOT NULL`);
            expect(body).toContain(
                "`cloudinary_public_id` VARCHAR(255) NOT NULL",
            );
            expect(body).toContain("`url` VARCHAR(500) NOT NULL");
            expect(body).toContain("`position` SMALLINT UNSIGNED NOT NULL");
            expect(body).toContain("`format` VARCHAR(20) NOT NULL");
            expect(body).toContain("`bytes` INTEGER UNSIGNED NOT NULL");
            expect(body).toContain("`width` INTEGER UNSIGNED NOT NULL");
            expect(body).toContain("`height` INTEGER UNSIGNED NOT NULL");
            expect(body).toContain("`updated_at` DATETIME(3) NOT NULL");
            expect(body).not.toMatch(/BLOB|BINARY/);
        });

        it(hasCover ? "has the cover flag" : "has no cover flag", () => {
            const body = readImageTableBody();

            if (hasCover) {
                expect(body).toContain(
                    "`is_cover` BOOLEAN NOT NULL DEFAULT false",
                );
                return;
            }
            expect(body).not.toContain("`is_cover`");
        });

        it("keeps the Cloudinary public id unique and indexes the gallery order", () => {
            const body = readImageTableBody();

            expect(body).toMatch(
                /UNIQUE INDEX `\w+`\(`cloudinary_public_id`\)/,
            );
            expect(body).toContain(
                `INDEX \`${table}_${owner}_position_idx\`(\`${owner}\`, \`position\`)`,
            );
        });

        it("keeps the CHECKs for positive bytes and dimensions", () => {
            const sql = readAllMigrationsSql();

            expect(sql).toContain(
                `ALTER TABLE \`${table}\` ADD CONSTRAINT \`${table}_bytes_check\` CHECK (\`bytes\` > 0);`,
            );
            expect(sql).toContain(
                `ALTER TABLE \`${table}\` ADD CONSTRAINT \`${table}_dimensions_check\` CHECK (\`width\` > 0 AND \`height\` > 0);`,
            );
        });

        it("keeps the owner as a RESTRICT foreign key (RN011)", () => {
            expect(readAllMigrationsSql()).toContain(
                `FOREIGN KEY (\`${owner}\`) REFERENCES \`${parent}\`(\`id\`) ON DELETE RESTRICT`,
            );
        });
    });

    function readTableBody(table) {
        const sql = readAllMigrationsSql();
        const start = sql.indexOf(`CREATE TABLE \`${table}\` (`);
        expect(start).toBeGreaterThan(-1);
        return sql.slice(start, sql.indexOf("\n) ", start));
    }

    it("stores a search of a signed-in user with dates, guests and JSON filters (doc 25 §23, RF086)", () => {
        const body = readTableBody("search_history");

        expect(body).toContain("`user_id` CHAR(36) NOT NULL");
        expect(body).toContain("`destination` VARCHAR(200) NOT NULL");
        expect(body).toContain("`check_in` DATE NOT NULL");
        expect(body).toContain("`check_out` DATE NOT NULL");
        expect(body).toContain("`guests` SMALLINT UNSIGNED NOT NULL");
        expect(body).toContain("`filters` JSON NOT NULL");
        expect(body).toContain(
            "INDEX `search_history_user_id_created_at_idx`(`user_id`, `created_at`)",
        );
    });

    it("keeps the search history CHECKs for ordered dates and at least one guest", () => {
        const sql = readAllMigrationsSql();

        expect(sql).toContain(
            "ALTER TABLE `search_history` ADD CONSTRAINT `search_history_dates_check` CHECK (`check_in` < `check_out`);",
        );
        expect(sql).toContain(
            "ALTER TABLE `search_history` ADD CONSTRAINT `search_history_guests_check` CHECK (`guests` >= 1);",
        );
    });

    it("keeps the search history owner as a RESTRICT foreign key to user", () => {
        expect(readAllMigrationsSql()).toMatch(
            /ALTER TABLE `search_history` ADD CONSTRAINT `\w+` FOREIGN KEY \(`user_id`\) REFERENCES `user`\(`id`\) ON DELETE RESTRICT/,
        );
    });

    describe.each(["search_impression", "search_click"])(
        "%s (doc 25 §23, RF132-133)",
        (table) => {
            it("records the unit with an optional user and search, without updated_at", () => {
                const body = readTableBody(table);

                expect(body).toContain("`unit_id` CHAR(36) NOT NULL");
                expect(body).toContain("`user_id` CHAR(36) NULL");
                expect(body).toContain("`search_id` CHAR(36) NULL");
                expect(body).not.toContain("`updated_at`");
            });

            it("indexes the unit by date for CTR and relevance (doc 25 §27)", () => {
                expect(readTableBody(table)).toContain(
                    `INDEX \`${table}_unit_id_created_at_idx\`(\`unit_id\`, \`created_at\`)`,
                );
            });

            it.each([
                ["user_id", "user"],
                ["unit_id", "hotel_unit"],
                ["search_id", "search_history"],
            ])("keeps %s as a RESTRICT foreign key to %s", (column, parent) => {
                expect(readAllMigrationsSql()).toContain(
                    `ALTER TABLE \`${table}\` ADD CONSTRAINT \`${table}_${column}_fkey\` FOREIGN KEY (\`${column}\`) REFERENCES \`${parent}\`(\`id\`) ON DELETE RESTRICT`,
                );
            });
        },
    );
});
