import { defineConfig } from "vitest/config";

const INTEGRATION_TEST_FILES = "tests/integration/**";

const DOM_TEST_FILES = [
    "tests/components/**/*.test.{js,jsx}",
    "tests/hooks/**/*.test.{js,jsx}",
];

export default defineConfig({
    test: {
        passWithNoTests: true,
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
