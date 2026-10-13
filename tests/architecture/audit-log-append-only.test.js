import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT_DIR = join(import.meta.dirname, "../..");
const SOURCE_DIRS = [join(ROOT_DIR, "src"), join(ROOT_DIR, "prisma")];
const GENERATED_DIR = join(ROOT_DIR, "src", "generated");
const AUDIT_LOG_REPOSITORY = "src/repositories/audit-log-repository.js";

const MUTATING_CLIENT_CALL =
    /\bauditLog\s*\.\s*(update|updateMany|delete|deleteMany|upsert)\b/;
const MUTATING_RAW_SQL = /\b(UPDATE|DELETE\s+FROM)\s+`?audit_log\b/i;
const MODEL_ACCESS = /\.auditLog\b/;

function listScriptFiles(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        if (path === GENERATED_DIR) {
            return [];
        }
        if (entry.isDirectory()) {
            return listScriptFiles(path);
        }
        return /\.(js|jsx|mjs)$/.test(entry.name) ? [path] : [];
    });
}

function toPortablePath(path) {
    return relative(ROOT_DIR, path).replaceAll("\\", "/");
}

function findFilesMatching(pattern) {
    return SOURCE_DIRS.flatMap(listScriptFiles)
        .filter((path) => pattern.test(readFileSync(path, "utf8")))
        .map(toPortablePath);
}

describe("audit log append-only guard (RN107, DT022)", () => {
    it("finds no code that updates or deletes audit log rows through the Prisma client", () => {
        expect(findFilesMatching(MUTATING_CLIENT_CALL)).toEqual([]);
    });

    it("finds no raw SQL that updates or deletes audit log rows", () => {
        expect(findFilesMatching(MUTATING_RAW_SQL)).toEqual([]);
    });

    it("lets only the audit log repository touch the auditLog model", () => {
        expect(findFilesMatching(MODEL_ACCESS)).toEqual([AUDIT_LOG_REPOSITORY]);
    });

    describe("detection patterns", () => {
        it.each([
            "client.auditLog.update({ where: { id } })",
            "tx.auditLog.updateMany({})",
            "prisma.auditLog.delete({ where: { id } })",
            "prisma.auditLog . deleteMany()",
            "client.auditLog.upsert({})",
        ])("flags the client call %j", (code) => {
            expect(MUTATING_CLIENT_CALL.test(code)).toBe(true);
        });

        it.each([
            "client.auditLog.create({ data })",
            "client.auditLog.findMany()",
            "const auditLogRepository = createAuditLogRepository()",
        ])("accepts the client call %j", (code) => {
            expect(MUTATING_CLIENT_CALL.test(code)).toBe(false);
        });

        it.each([
            "UPDATE audit_log SET reason = 'x'",
            "delete from `audit_log`",
            "DELETE   FROM audit_log WHERE id = 1",
        ])("flags the raw SQL %j", (sql) => {
            expect(MUTATING_RAW_SQL.test(sql)).toBe(true);
        });

        it.each([
            "SELECT * FROM audit_log",
            "INSERT INTO audit_log (id) VALUES (1)",
            "CREATE TABLE `audit_log` (",
        ])("accepts the raw SQL %j", (sql) => {
            expect(MUTATING_RAW_SQL.test(sql)).toBe(false);
        });
    });
});
