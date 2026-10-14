import { randomUUID } from "node:crypto";
import { SYSTEM_ACCEPTANCE_TYPES } from "../src/constants/acceptance-types.js";
import { DEFAULT_SYSTEM_SETTINGS } from "../src/constants/system-settings.js";
import { getPrisma } from "../src/lib/prisma.js";

const EXPECTED_CHECK_CONSTRAINTS = Object.freeze([
    "hotel_unit_overbooking_percentage_check",
    "room_type_max_guests_check",
    "room_type_area_m2_check",
    "room_type_default_price_check",
    "bed_configuration_quantity_check",
    "room_status_is_active_check",
    "room_price_history_price_check",
    "room_price_history_validity_check",
    "room_type_history_validity_check",
]);

const EXPECTED_AUDIT_LOG_INDEXES = Object.freeze([
    "audit_log_entity_type_entity_id_created_at_idx",
    "audit_log_user_id_created_at_idx",
]);

const NOW = "2026-01-01 00:00:00";
const ROLLBACK_SIGNAL = Symbol("rollback");

const failures = [];

function report(label, isOk, detail = "") {
    console.log(
        `${isOk ? "PASS" : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`,
    );
    if (!isOk) {
        failures.push(label);
    }
}

function toNumber(value) {
    return Number(value);
}

async function checkConstraintsExist(prisma) {
    const rows = await prisma.$queryRawUnsafe(
        "SELECT CONSTRAINT_NAME AS name FROM information_schema.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE()",
    );
    const names = new Set(rows.map((row) => row.name));
    for (const name of EXPECTED_CHECK_CONSTRAINTS) {
        report(`check constraint ${name} exists`, names.has(name));
    }
}

async function checkAddressCoordinatesNullable(prisma) {
    const rows = await prisma.$queryRawUnsafe(
        "SELECT COLUMN_NAME AS name, IS_NULLABLE AS nullable FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'address' AND COLUMN_NAME IN ('latitude', 'longitude')",
    );
    for (const column of ["latitude", "longitude"]) {
        const row = rows.find((candidate) => candidate.name === column);
        report(`address.${column} is nullable`, row?.nullable === "YES");
    }
}

async function checkAuditLogStructure(prisma) {
    const indexes = await prisma.$queryRawUnsafe(
        "SELECT DISTINCT INDEX_NAME AS name FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_log'",
    );
    const indexNames = new Set(indexes.map((row) => row.name));
    for (const name of EXPECTED_AUDIT_LOG_INDEXES) {
        report(`audit_log index ${name} exists`, indexNames.has(name));
    }

    const foreignKeys = await prisma.$queryRawUnsafe(
        "SELECT REFERENCED_TABLE_NAME AS target FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_log' AND CONSTRAINT_NAME = 'audit_log_user_id_fkey'",
    );
    report(
        "audit_log foreign key to user exists",
        foreignKeys.some((row) => row.target === "user"),
    );
}

async function checkSeedHasNoDuplicates(prisma) {
    const [acceptanceTypes] = await prisma.$queryRawUnsafe(
        "SELECT COUNT(*) AS total FROM acceptance_type WHERE is_system = 1",
    );
    report(
        "seed acceptance types counted once",
        toNumber(acceptanceTypes.total) === SYSTEM_ACCEPTANCE_TYPES.length,
        `${acceptanceTypes.total} rows`,
    );

    const [settings] = await prisma.$queryRawUnsafe(
        "SELECT COUNT(*) AS total FROM system_setting",
    );
    report(
        "seed system settings counted once",
        toNumber(settings.total) === DEFAULT_SYSTEM_SETTINGS.length,
        `${settings.total} rows`,
    );

    const [admins] = await prisma.$queryRawUnsafe(
        "SELECT COUNT(*) AS total FROM user WHERE role = 'ADMIN'",
    );
    report(
        "seed admin created once",
        toNumber(admins.total) === 1,
        `${admins.total} rows`,
    );
}

async function insertFixture(client) {
    const ids = {
        user: randomUUID(),
        hotel: randomUUID(),
        unit: randomUUID(),
        roomType: randomUUID(),
        room: randomUUID(),
    };
    const suffix = ids.user.replaceAll("-", "").slice(0, 11);

    await client.$executeRawUnsafe(
        "INSERT INTO user (id, name, email, cpf, password_hash, role, updated_at) VALUES (?, 'Constraint Probe', ?, ?, 'x', 'MANAGER', ?)",
        ids.user,
        `probe-${suffix}@example.com`,
        suffix.replace(/\D/g, "0").padEnd(11, "0"),
        NOW,
    );
    await client.$executeRawUnsafe(
        "INSERT INTO hotel (id, owner_user_id, name, description, category, cnpj, email, updated_at) VALUES (?, ?, 'Probe', 'Probe', 'HOTEL', '00000000000000', 'probe@example.com', ?)",
        ids.hotel,
        ids.user,
        NOW,
    );
    await client.$executeRawUnsafe(
        "INSERT INTO hotel_unit (id, hotel_id, name, email, check_in_time, check_out_time, updated_at) VALUES (?, ?, 'Probe', 'probe@example.com', '14:00:00', '12:00:00', ?)",
        ids.unit,
        ids.hotel,
        NOW,
    );
    await client.$executeRawUnsafe(
        "INSERT INTO address (id, unit_id, zip_code, street, number, neighborhood, city, state, updated_at) VALUES (?, ?, '01001000', 'Rua', '1', 'Centro', 'São Paulo', 'SP', ?)",
        randomUUID(),
        ids.unit,
        NOW,
    );
    await client.$executeRawUnsafe(
        "INSERT INTO room_type (id, hotel_id, name, description, max_guests, area_m2, default_price, updated_at) VALUES (?, ?, 'Probe', 'Probe', 2, 20.00, 100.00, ?)",
        ids.roomType,
        ids.hotel,
        NOW,
    );
    await client.$executeRawUnsafe(
        "INSERT INTO room (id, unit_id, room_type_id, number, floor, updated_at) VALUES (?, ?, ?, '101', 1, ?)",
        ids.room,
        ids.unit,
        ids.roomType,
        NOW,
    );
    return ids;
}

function buildViolations(ids) {
    return [
        {
            label: "hotel_unit.overbooking_percentage = 11 is rejected",
            constraint: "hotel_unit_overbooking_percentage_check",
            sql: "UPDATE hotel_unit SET overbooking_percentage = 11 WHERE id = ?",
            params: [ids.unit],
        },
        {
            label: "room_type.default_price = 0 is rejected",
            constraint: "room_type_default_price_check",
            sql: "UPDATE room_type SET default_price = 0 WHERE id = ?",
            params: [ids.roomType],
        },
        {
            label: "room_type.max_guests = 0 is rejected",
            constraint: "room_type_max_guests_check",
            sql: "UPDATE room_type SET max_guests = 0 WHERE id = ?",
            params: [ids.roomType],
        },
        {
            label: "room_type.area_m2 = 0 is rejected",
            constraint: "room_type_area_m2_check",
            sql: "UPDATE room_type SET area_m2 = 0 WHERE id = ?",
            params: [ids.roomType],
        },
        {
            label: "bed_configuration.quantity = 0 is rejected",
            constraint: "bed_configuration_quantity_check",
            sql: "INSERT INTO bed_configuration (id, room_type_id, bed_type, quantity) VALUES (?, ?, 'SINGLE', 0)",
            params: [randomUUID(), ids.roomType],
        },
        {
            label: "room INACTIVE with is_active = 1 is rejected",
            constraint: "room_status_is_active_check",
            sql: "UPDATE room SET status = 'INACTIVE', is_active = 1 WHERE id = ?",
            params: [ids.room],
        },
        {
            label: "room_price_history.price = 0 is rejected",
            constraint: "room_price_history_price_check",
            sql: "INSERT INTO room_price_history (id, room_id, price, valid_from) VALUES (?, ?, 0, ?)",
            params: [randomUUID(), ids.room, NOW],
        },
        {
            label: "room_price_history.valid_until < valid_from is rejected",
            constraint: "room_price_history_validity_check",
            sql: "INSERT INTO room_price_history (id, room_id, price, valid_from, valid_until) VALUES (?, ?, 10, ?, '2025-01-01 00:00:00')",
            params: [randomUUID(), ids.room, NOW],
        },
        {
            label: "room_type_history.valid_until < valid_from is rejected",
            constraint: "room_type_history_validity_check",
            sql: "INSERT INTO room_type_history (id, room_id, room_type_id, valid_from, valid_until) VALUES (?, ?, ?, ?, '2025-01-01 00:00:00')",
            params: [randomUUID(), ids.room, ids.roomType, NOW],
        },
    ];
}

async function expectViolation(client, violation) {
    try {
        await client.$executeRawUnsafe(violation.sql, ...violation.params);
        report(violation.label, false, "statement was accepted");
    } catch (error) {
        const message = String(error?.message ?? "");
        report(
            violation.label,
            message.includes(violation.constraint),
            message.includes(violation.constraint) ? "" : message.slice(0, 200),
        );
    }
}

async function checkConstraintsReject(prisma) {
    try {
        await prisma.$transaction(async (client) => {
            const ids = await insertFixture(client);
            const [address] = await client.$queryRawUnsafe(
                "SELECT latitude, longitude FROM address WHERE unit_id = ?",
                ids.unit,
            );
            report(
                "address accepts NULL coordinates",
                address.latitude === null && address.longitude === null,
            );
            for (const violation of buildViolations(ids)) {
                await expectViolation(client, violation);
            }
            throw ROLLBACK_SIGNAL;
        });
    } catch (error) {
        if (error !== ROLLBACK_SIGNAL) {
            throw error;
        }
    }
}

const prisma = getPrisma();

try {
    await checkConstraintsExist(prisma);
    await checkAddressCoordinatesNullable(prisma);
    await checkAuditLogStructure(prisma);
    await checkSeedHasNoDuplicates(prisma);
    await checkConstraintsReject(prisma);
} catch (error) {
    report(
        "unexpected error",
        false,
        String(error?.message ?? error).slice(0, 300),
    );
} finally {
    await prisma.$disconnect();
}

if (failures.length > 0) {
    console.error(`${failures.length} check(s) failed.`);
    process.exit(1);
}
console.log("All MySQL checks passed.");
