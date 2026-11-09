import { describe, expect, it } from "vitest";
import vitestConfig, {
    COVERAGE_EXCLUDE,
    COVERAGE_THRESHOLDS,
    CRITICAL_MODULES_GLOB,
} from "../../vitest.config.js";

const METRICS = ["statements", "branches", "functions", "lines"];

const GLOBAL_FLOORS = {
    statements: 97,
    branches: 96,
    functions: 97,
    lines: 97,
};

const CRITICAL_FLOORS = {
    statements: 98,
    branches: 98,
    functions: 98,
    lines: 98,
};

const REQUIRED_EXCLUDES = [
    "src/generated/**",
    "src/domain/**",
    "src/app/**/page.jsx",
    "src/app/**/layout.jsx",
];

const coverage = vitestConfig.test.coverage;

describe("coverage configuration (doc 16, QA-02)", () => {
    it("uses the v8 provider over src with text and lcov reports", () => {
        expect(coverage.provider).toBe("v8");
        expect(coverage.include).toEqual(["src/**/*.{js,jsx,mjs}"]);
        expect(coverage.reporter).toEqual(
            expect.arrayContaining(["text", "lcov"]),
        );
        expect(coverage.reportsDirectory).toBe("coverage");
    });

    it.each(REQUIRED_EXCLUDES)("excludes %s", (pattern) => {
        expect(coverage.exclude).toContain(pattern);
        expect(COVERAGE_EXCLUDE).toContain(pattern);
    });

    it("applies the exported thresholds", () => {
        expect(coverage.thresholds).toBe(COVERAGE_THRESHOLDS);
    });

    it.each(METRICS)(
        "keeps the global %s threshold at or above its floor",
        (metric) => {
            expect(COVERAGE_THRESHOLDS[metric]).toBeGreaterThanOrEqual(
                GLOBAL_FLOORS[metric],
            );
        },
    );

    it("covers availability, reservations and pricing with their own thresholds", () => {
        expect(CRITICAL_MODULES_GLOB).toBe(
            "src/modules/{availability,reservations,pricing}/**",
        );
        expect(COVERAGE_THRESHOLDS[CRITICAL_MODULES_GLOB]).toBeDefined();
    });

    it.each(METRICS)(
        "keeps the critical modules %s threshold above the global one",
        (metric) => {
            const criticalThreshold =
                COVERAGE_THRESHOLDS[CRITICAL_MODULES_GLOB][metric];

            expect(criticalThreshold).toBeGreaterThanOrEqual(
                CRITICAL_FLOORS[metric],
            );
            expect(criticalThreshold).toBeGreaterThan(
                COVERAGE_THRESHOLDS[metric],
            );
        },
    );
});
