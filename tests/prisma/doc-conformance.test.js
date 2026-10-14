import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
    parsePrismaModels,
    readPrismaModels,
    readPrismaSchema,
} from "../helpers/prisma-schema.js";

const DOC_PATH = join(
    import.meta.dirname,
    "../../hotel-booking-github-docs/25-database-model.md",
);

const DOC_TABLES_BY_SECTION = {
    3: ["USER"],
    4: ["HOTEL", "HOTEL_MANAGER", "HOTEL_REVIEW_NOTE"],
    5: ["ACCEPTANCE_TYPE", "HOTEL_ACCEPTANCE"],
    6: ["HOTEL_POLICY"],
    7: ["HOTEL_UNIT", "ADDRESS", "UNIT_PHONE"],
    8: ["ROOM_TYPE", "BED_CONFIGURATION"],
    9: ["ROOM"],
    10: ["ROOM_TYPE_HISTORY", "ROOM_PRICE_HISTORY", "ROOM_PRICE_PERIOD"],
    11: [
        "AMENITY",
        "HOTEL_AMENITY",
        "UNIT_AMENITY",
        "ROOM_TYPE_AMENITY",
        "ROOM_AMENITY",
    ],
    12: ["HOTEL_IMAGE", "UNIT_IMAGE", "ROOM_TYPE_IMAGE"],
    13: ["UNIT_BLOCK", "ROOM_BLOCK"],
    14: ["RESERVATION", "RESERVATION_ROOM", "RESERVATION_ROOM_NIGHT"],
    15: ["GUEST"],
    16: ["PAYMENT", "STRIPE_WEBHOOK_EVENT"],
    17: ["REFUND"],
    18: [
        "REVIEW",
        "REVIEW_SCORE",
        "REVIEW_MEDIA",
        "REVIEW_COMMENT",
        "REVIEW_REPORT",
    ],
    19: [
        "FAVORITE_HOTEL_LIST",
        "FAVORITE_HOTEL_ITEM",
        "FAVORITE_ROOM_LIST",
        "FAVORITE_ROOM_ITEM",
    ],
    20: ["PROMOTION"],
    21: ["NOTIFICATION", "EMAIL_DELIVERY"],
    22: ["JOB_EXECUTION"],
    23: ["SEARCH_HISTORY", "SEARCH_IMPRESSION", "SEARCH_CLICK"],
    24: ["DAILY_METRIC"],
    25: ["AUDIT_LOG"],
    26: ["SYSTEM_SETTING"],
};

const PENDING_TABLES = [
    "ROOM_PRICE_PERIOD",
    "HOTEL_IMAGE",
    "UNIT_IMAGE",
    "ROOM_TYPE_IMAGE",
    "UNIT_BLOCK",
    "ROOM_BLOCK",
    "RESERVATION",
    "RESERVATION_ROOM",
    "RESERVATION_ROOM_NIGHT",
    "GUEST",
    "PAYMENT",
    "STRIPE_WEBHOOK_EVENT",
    "REFUND",
    "REVIEW",
    "REVIEW_SCORE",
    "REVIEW_MEDIA",
    "REVIEW_COMMENT",
    "REVIEW_REPORT",
    "FAVORITE_HOTEL_LIST",
    "FAVORITE_HOTEL_ITEM",
    "FAVORITE_ROOM_LIST",
    "FAVORITE_ROOM_ITEM",
    "PROMOTION",
    "NOTIFICATION",
    "EMAIL_DELIVERY",
    "JOB_EXECUTION",
    "SEARCH_HISTORY",
    "SEARCH_IMPRESSION",
    "SEARCH_CLICK",
    "DAILY_METRIC",
];

const DOC_TABLES = Object.values(DOC_TABLES_BY_SECTION).flat();
const EXISTING_TABLES = DOC_TABLES.filter(
    (table) => !PENDING_TABLES.includes(table),
);

const SNAKE_CASE_PATTERN = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;
const PASCAL_CASE_PATTERN = /^[A-Z][a-zA-Z0-9]*$/;
const CAMEL_CASE_PATTERN = /^[a-z][a-zA-Z0-9]*$/;
const UUID_ID_ATTRIBUTES = "@id @default(uuid()) @db.Char(36)";
const MONEY_FIELD_PATTERN =
    /^(price|amount)$|(Price|Amount|Fee|Commission)(Snapshot)?$|^discountValue/;
const MONEY_DECIMAL_PATTERN = /@db\.Decimal\(\d+, 2\)/;
const FLOATING_POINT_PATTERN = /\bFloat\b|@db\.(Double|Float|Real)\b/;

function readDocTableNames() {
    const doc = readFileSync(DOC_PATH, "utf8");
    const tablesSection = doc.slice(
        doc.indexOf("## 3. Usuários"),
        doc.indexOf("## 27."),
    );
    const headingTables = [...tablesSection.matchAll(/^### (\w+)$/gm)].map(
        ([, table]) => table,
    );
    const amenitySection = tablesSection.slice(
        tablesSection.indexOf("## 11."),
        tablesSection.indexOf("## 12."),
    );
    const [, relationshipBlock] = amenitySection.match(
        /Relacionamentos:\s*```text\n([\s\S]*?)```/,
    );
    return [
        ...headingTables,
        ...relationshipBlock.split(/\s+/).filter(Boolean),
    ];
}

function convertPascalToSnakeCase(name) {
    return name.replace(/(?<!^)([A-Z])/g, "_$1").toLowerCase();
}

function readColumnName(field) {
    return field.attributes.match(/@map\("([^"]+)"\)/)?.[1] ?? field.name;
}

function isScalarField(field, models) {
    return !models.some((model) => model.name === field.type);
}

function readRelationFieldNames(model) {
    return model.fields.flatMap((field) => {
        const fieldsList = field.attributes.match(/fields: \[([^\]]+)\]/)?.[1];
        return fieldsList
            ? fieldsList.split(",").map((name) => name.trim())
            : [];
    });
}

function readCompositeIdFieldNames(model) {
    const idList = model.body.match(/@@id\(\[([^\]]+)\]\)/)?.[1];
    return idList ? idList.split(",").map((name) => name.trim()) : [];
}

function findField(model, name) {
    return model.fields.find((field) => field.name === name);
}

function findTableViolations(models) {
    return models.flatMap((model) => {
        const violations = [];
        if (!PASCAL_CASE_PATTERN.test(model.name)) {
            violations.push(`${model.name}: model name is not PascalCase`);
        }
        if (model.mapName !== convertPascalToSnakeCase(model.name)) {
            violations.push(
                `${model.name}: @@map must be "${convertPascalToSnakeCase(model.name)}"`,
            );
        }
        if (!DOC_TABLES.includes(model.mapName?.toUpperCase())) {
            violations.push(`${model.name}: table is not listed in doc 25`);
        }
        return violations;
    });
}

function findColumnViolations(models) {
    return models.flatMap((model) =>
        model.fields
            .filter((field) => isScalarField(field, models))
            .flatMap((field) => {
                const violations = [];
                if (!CAMEL_CASE_PATTERN.test(field.name)) {
                    violations.push(
                        `${model.name}.${field.name}: not camelCase`,
                    );
                }
                if (!SNAKE_CASE_PATTERN.test(readColumnName(field))) {
                    violations.push(
                        `${model.name}.${field.name}: column is not snake_case`,
                    );
                }
                return violations;
            }),
    );
}

function findIdViolations(models) {
    return models.flatMap((model) => {
        const compositeIdFields = readCompositeIdFieldNames(model);
        if (compositeIdFields.length > 0) {
            return compositeIdFields
                .filter(
                    (name) =>
                        !findField(model, name)?.attributes.includes(
                            "@db.Char(36)",
                        ),
                )
                .map(
                    (name) => `${model.name}.${name}: id part is not CHAR(36)`,
                );
        }
        const idField = findField(model, "id");
        const isUuidId =
            idField?.type === "String" &&
            idField.modifier === "" &&
            idField.attributes.startsWith(UUID_ID_ATTRIBUTES);
        return isUuidId
            ? []
            : [`${model.name}: id must be String ${UUID_ID_ATTRIBUTES}`];
    });
}

function findForeignKeyViolations(models) {
    return models.flatMap((model) => {
        const restrictViolations = model.fields
            .filter((field) => field.attributes.includes("fields: ["))
            .filter((field) => !field.attributes.includes("onDelete: Restrict"))
            .map(
                (field) =>
                    `${model.name}.${field.name}: onDelete is not Restrict`,
            );
        const typeViolations = readRelationFieldNames(model)
            .filter(
                (name) =>
                    !findField(model, name)?.attributes.includes(
                        "@db.Char(36)",
                    ),
            )
            .map(
                (name) => `${model.name}.${name}: foreign key is not CHAR(36)`,
            );
        return [...restrictViolations, ...typeViolations];
    });
}

function findMoneyViolations(schema) {
    const models = parsePrismaModels(schema);
    const floatingPointLines = schema
        .split("\n")
        .filter((line) => FLOATING_POINT_PATTERN.test(line))
        .map((line) => `floating point type: ${line.trim()}`);
    const moneyFieldViolations = models.flatMap((model) =>
        model.fields
            .filter((field) => MONEY_FIELD_PATTERN.test(field.name))
            .filter(
                (field) =>
                    field.type !== "Decimal" ||
                    !MONEY_DECIMAL_PATTERN.test(field.attributes),
            )
            .map(
                (field) =>
                    `${model.name}.${field.name}: money must be Decimal with 2 places`,
            ),
    );
    return [...floatingPointLines, ...moneyFieldViolations];
}

function findConventionViolations(schema) {
    const models = parsePrismaModels(schema);
    return [
        ...findTableViolations(models),
        ...findColumnViolations(models),
        ...findIdViolations(models),
        ...findForeignKeyViolations(models),
    ];
}

describe("prisma schema conformance with doc 25", () => {
    it("lists exactly the tables of doc 25 sections 3 to 26", () => {
        expect([...DOC_TABLES].sort()).toEqual(readDocTableNames().sort());
    });

    it("keeps every pending table inside the doc 25 list", () => {
        expect(
            PENDING_TABLES.filter((table) => !DOC_TABLES.includes(table)),
        ).toEqual([]);
    });

    it("maps every model to a table of doc 25 that is not pending", () => {
        const schemaTables = readPrismaModels().map((model) =>
            model.mapName?.toUpperCase(),
        );

        expect(
            schemaTables.filter((table) => !EXISTING_TABLES.includes(table)),
        ).toEqual([]);
    });

    it("has a model for every table of doc 25 that is not pending", () => {
        const schemaTables = readPrismaModels().map((model) =>
            model.mapName?.toUpperCase(),
        );

        expect(
            EXISTING_TABLES.filter((table) => !schemaTables.includes(table)),
        ).toEqual([]);
    });

    it("follows the naming, id and foreign key conventions of doc 25 §2", () => {
        expect(findConventionViolations(readPrismaSchema())).toEqual([]);
    });

    it("never stores money or any other value as floating point (doc 25 §1, DT020)", () => {
        expect(findMoneyViolations(readPrismaSchema())).toEqual([]);
    });

    it("flags a Float money column and a table outside the convention", () => {
        const schema = [
            "model Hotels {",
            "    id    String @id @default(uuid()) @db.Char(36)",
            "    price Float",
            "    ownerId String",
            "",
            "    owner User @relation(fields: [ownerId], references: [id], onDelete: Cascade)",
            "",
            '    @@map("hotels")',
            "}",
        ].join("\n");

        expect(findMoneyViolations(schema)).toEqual([
            "floating point type: price Float",
            "Hotels.price: money must be Decimal with 2 places",
        ]);
        expect(findConventionViolations(schema)).toEqual([
            "Hotels: table is not listed in doc 25",
            "Hotels.ownerId: column is not snake_case",
            "Hotels.owner: onDelete is not Restrict",
            "Hotels.ownerId: foreign key is not CHAR(36)",
        ]);
    });
});
