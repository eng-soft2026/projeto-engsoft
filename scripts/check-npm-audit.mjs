import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { evaluateAuditReport } from "./npm-audit-policy.mjs";

const ALLOWLIST_URL = new URL("./npm-audit-allowlist.json", import.meta.url);
const AUDIT_COMMAND = "npm audit --omit=dev --json";

function runNpmAudit() {
    const result = spawnSync(AUDIT_COMMAND, {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        shell: true,
    });
    if (!result.stdout) {
        console.error("npm audit produced no output.");
        console.error(String(result.stderr ?? "").slice(0, 2000));
        process.exit(1);
    }
    return JSON.parse(result.stdout);
}

function formatAdvisory(advisory) {
    return `${advisory.id} ${advisory.severity} ${advisory.packageName}: ${advisory.title} (${advisory.url})`;
}

const allowlist = JSON.parse(readFileSync(ALLOWLIST_URL, "utf8"));
const auditReport = runNpmAudit();
const { blocking, allowed, staleAllowlistIds } = evaluateAuditReport(
    auditReport,
    allowlist,
);

for (const advisory of allowed) {
    console.log(`ALLOWED ${formatAdvisory(advisory)}`);
}
for (const id of staleAllowlistIds) {
    console.log(
        `STALE ${id} is no longer reported; remove it from scripts/npm-audit-allowlist.json`,
    );
}
for (const advisory of blocking) {
    console.error(`BLOCKING ${formatAdvisory(advisory)}`);
}

if (blocking.length > 0) {
    console.error(
        `${blocking.length} high or critical advisory(ies) outside the allowlist.`,
    );
    process.exit(1);
}
console.log("No high or critical advisory outside the allowlist.");
