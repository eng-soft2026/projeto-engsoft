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

const MODEL_PATTERN = /^model (\w+) \{\n([\s\S]*?)\n\}/gm;
const FIELD_PATTERN = /^\s+([a-z]\w*)\s+(\w+)(\[\]|\?)?(.*)$/;

function parseModelFields(body) {
    return body
        .split("\n")
        .map((line) => line.match(FIELD_PATTERN))
        .filter(Boolean)
        .map(([, name, type, modifier = "", attributes]) => ({
            name,
            type,
            modifier,
            attributes: attributes.trim(),
        }));
}

export function parsePrismaModels(schema) {
    return [...schema.matchAll(MODEL_PATTERN)].map(([, name, body]) => ({
        name,
        mapName: body.match(/@@map\("([^"]+)"\)/)?.[1] ?? null,
        body,
        fields: parseModelFields(body),
    }));
}

export function readPrismaModels() {
    return parsePrismaModels(readPrismaSchema());
}
