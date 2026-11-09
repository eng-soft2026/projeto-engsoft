import { defineConfig } from "vitest/config";

const INTEGRATION_TEST_FILES = "tests/integration/**";

const DOM_TEST_FILES = [
    "tests/components/**/*.test.{js,jsx}",
    "tests/hooks/**/*.test.{js,jsx}",
];

export const COVERAGE_EXCLUDE = [
    "src/generated/**",
    "src/domain/**",
    "src/app/**/page.jsx",
    "src/app/**/layout.jsx",
];

export const CRITICAL_MODULES_GLOB =
    "src/modules/{availability,reservations,pricing}/**";

export const COVERAGE_THRESHOLDS = {
    statements: 97,
    branches: 96,
    functions: 97,
    lines: 97,
    [CRITICAL_MODULES_GLOB]: {
        statements: 98,
        branches: 98,
        functions: 98,
        lines: 98,
    },
};

export default defineConfig({
    test: {
        passWithNoTests: true,
        coverage: {
            provider: "v8",
            include: ["src/**/*.{js,jsx,mjs}"],
            exclude: COVERAGE_EXCLUDE,
            reporter: ["text", "text-summary", "lcov"],
            reportsDirectory: "coverage",
            thresholds: COVERAGE_THRESHOLDS,
        },
        server: {
            deps: {
                inline: ["next-auth"],
            },
        },
        projects: [
            {
                extends: true,
                test: {
                    name: "unit",
                    environment: "node",
                    include: ["tests/**/*.test.{js,jsx}"],
                    exclude: [...DOM_TEST_FILES, INTEGRATION_TEST_FILES],
                },
            },
            {
                extends: true,
                test: {
                    name: "dom",
                    environment: "jsdom",
                    include: DOM_TEST_FILES,
                    setupFiles: ["tests/setup/dom.js"],
                },
            },
        ],
    },
});
