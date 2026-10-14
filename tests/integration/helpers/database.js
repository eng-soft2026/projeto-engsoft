import { getPrisma } from "../../../src/lib/prisma.js";
import { seedDatabase } from "../../../prisma/seeds/seed-database.js";

const MIGRATIONS_TABLE = "_prisma_migrations";

async function listTables(prisma) {
    const rows = await prisma.$queryRawUnsafe(
        "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'",
    );
    return rows
        .map((row) => row.name)
        .filter((name) => name !== MIGRATIONS_TABLE);
}

async function listForeignKeys(prisma) {
    return prisma.$queryRawUnsafe(
        "SELECT TABLE_NAME AS child, REFERENCED_TABLE_NAME AS parent FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL",
    );
}

export function orderTablesForDeletion(tables, foreignKeys) {
    const pendingChildren = new Map(tables.map((table) => [table, new Set()]));
    for (const { child, parent } of foreignKeys) {
        if (child !== parent && pendingChildren.has(parent)) {
            pendingChildren.get(parent).add(child);
        }
    }

    const ordered = [];
    while (pendingChildren.size > 0) {
        const deletable = [...pendingChildren.keys()].filter(
            (table) => pendingChildren.get(table).size === 0,
        );
        if (deletable.length === 0) {
            throw new Error(
                "Foreign key cycle prevents resetting the database",
            );
        }
        for (const table of deletable.sort()) {
            ordered.push(table);
            pendingChildren.delete(table);
            for (const children of pendingChildren.values()) {
                children.delete(table);
            }
        }
    }
    return ordered;
}

export async function resetDatabase(prisma = getPrisma()) {
    const [tables, foreignKeys] = await Promise.all([
        listTables(prisma),
        listForeignKeys(prisma),
    ]);
    for (const table of orderTablesForDeletion(tables, foreignKeys)) {
        await prisma.$executeRawUnsafe(`DELETE FROM \`${table}\``);
    }
}

export function seedBaseData(prisma = getPrisma()) {
    return seedDatabase(prisma);
}
