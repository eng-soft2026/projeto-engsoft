import { defineConfig } from "vitest/config";
import { loadTestEnvironment } from "./tests/integration/helpers/test-environment.js";

export default defineConfig({
    test: {
        name: "integration",
        environment: "node",
        include: ["tests/integration/**/*.test.js"],
        env: loadTestEnvironment(),
        globalSetup: ["tests/setup/integration-global.js"],
        setupFiles: ["tests/setup/integration.js"],
        fileParallelism: false,
        testTimeout: 20000,
        hookTimeout: 60000,
        server: {
            deps: {
                inline: ["next-auth"],
            },
        },
    },
});
