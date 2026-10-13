import { readFileSync } from "node:fs";
import { join } from "node:path";

const SCHEMA_PATH = join(import.meta.dirname, "../../prisma/schema.prisma");

export function readPrismaSchema() {
    return readFileSync(SCHEMA_PATH, "utf8");
}

export function readPrismaEnumValues(enumName) {
    const [, body] = readPrismaSchema().match(
        new RegExp(`enum ${enumName} \\{([^}]*)\\}`),
    );
    return body.split(/\s+/).filter(Boolean);
}
