import { describe, expect, it } from "vitest";
import allowlist from "../../scripts/npm-audit-allowlist.json" with { type: "json" };
import {
    collectAdvisories,
    evaluateAuditReport,
} from "../../scripts/npm-audit-policy.mjs";

function buildAdvisory(id, severity, name = "some-package") {
    return {
        name,
        severity,
        title: `${name} advisory`,
        url: `https://github.com/advisories/${id}`,
    };
}

function buildReport(vulnerabilities) {
    return { vulnerabilities };
}

describe("npm audit policy (QA-24)", () => {
    it("collects each advisory once and ignores package-to-package links", () => {
        const advisory = buildAdvisory("GHSA-aaaa-aaaa-aaaa", "high");
        const report = buildReport({
            "some-package": { name: "some-package", via: [advisory] },
            parent: { name: "parent", via: ["some-package"] },
            other: { name: "other", via: [advisory] },
        });

        expect(collectAdvisories(report).map((item) => item.id)).toEqual([
            "GHSA-aaaa-aaaa-aaaa",
        ]);
    });

    it("blocks high and critical advisories outside the allowlist", () => {
        const report = buildReport({
            a: { name: "a", via: [buildAdvisory("GHSA-high", "high", "a")] },
            b: {
                name: "b",
                via: [buildAdvisory("GHSA-critical", "critical", "b")],
            },
            c: {
                name: "c",
                via: [buildAdvisory("GHSA-moderate", "moderate", "c")],
            },
            d: { name: "d", via: [buildAdvisory("GHSA-low", "low", "d")] },
        });

        const { blocking } = evaluateAuditReport(report, []);

        expect(blocking.map((item) => item.id)).toEqual([
            "GHSA-high",
            "GHSA-critical",
        ]);
    });

    it("lets allowlisted advisories pass and reports stale allowlist entries", () => {
        const report = buildReport({
            a: { name: "a", via: [buildAdvisory("GHSA-known", "high", "a")] },
        });
        const entries = [{ id: "GHSA-known" }, { id: "GHSA-fixed" }];

        const result = evaluateAuditReport(report, entries);

        expect(result.blocking).toEqual([]);
        expect(result.allowed.map((item) => item.id)).toEqual(["GHSA-known"]);
        expect(result.staleAllowlistIds).toEqual(["GHSA-fixed"]);
    });

    it("accepts an empty report", () => {
        expect(evaluateAuditReport({}, [])).toEqual({
            blocking: [],
            allowed: [],
            staleAllowlistIds: [],
        });
    });

    it("documents every allowlist entry with a package, a reason and a review date", () => {
        for (const entry of allowlist) {
            expect(entry.id).toMatch(
                /^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/,
            );
            expect(entry.packageName).toEqual(expect.any(String));
            expect(entry.reason.length).toBeGreaterThan(20);
            expect(entry.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
    });
});
