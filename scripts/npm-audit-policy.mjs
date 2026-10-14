export const BLOCKING_SEVERITIES = Object.freeze(["high", "critical"]);

function extractAdvisoryId(url) {
    return String(url ?? "")
        .split("/")
        .pop();
}

export function collectAdvisories(auditReport) {
    const advisories = new Map();
    const vulnerabilities = Object.values(auditReport?.vulnerabilities ?? {});
    for (const vulnerability of vulnerabilities) {
        for (const source of vulnerability.via ?? []) {
            if (typeof source !== "object" || !source.url) {
                continue;
            }
            const id = extractAdvisoryId(source.url);
            advisories.set(id, {
                id,
                packageName: source.name ?? vulnerability.name,
                severity: source.severity,
                title: source.title,
                url: source.url,
            });
        }
    }
    return [...advisories.values()];
}

export function evaluateAuditReport(auditReport, allowlist) {
    const allowedIds = new Set(allowlist.map((entry) => entry.id));
    const advisories = collectAdvisories(auditReport);
    const blocking = advisories.filter(
        (advisory) =>
            BLOCKING_SEVERITIES.includes(advisory.severity) &&
            !allowedIds.has(advisory.id),
    );
    const allowed = advisories.filter((advisory) =>
        allowedIds.has(advisory.id),
    );
    const reportedIds = new Set(advisories.map((advisory) => advisory.id));
    const staleAllowlistIds = allowlist
        .map((entry) => entry.id)
        .filter((id) => !reportedIds.has(id));
    return { blocking, allowed, staleAllowlistIds };
}
