import { randomBytes } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";
import { loadTestEnvironment } from "./tests/integration/helpers/test-environment.js";

const E2E_PORT = 3100;
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
const WEB_SERVER_TIMEOUT_MS = 300_000;
const isCi = Boolean(process.env.CI);

const webServerEnvironment = {
    ...loadTestEnvironment(),
    AUTH_SECRET: process.env.AUTH_SECRET || randomBytes(32).toString("base64"),
    AUTH_URL: E2E_BASE_URL,
    LOG_LEVEL: process.env.LOG_LEVEL || "warn",
};

export default defineConfig({
    testDir: "e2e",
    testMatch: "**/*.spec.js",
    fullyParallel: false,
    forbidOnly: isCi,
    retries: isCi ? 1 : 0,
    workers: 1,
    reporter: isCi
        ? [["github"], ["html", { open: "never" }]]
        : [["list"], ["html", { open: "never" }]],
    use: {
        baseURL: E2E_BASE_URL,
        locale: "pt-BR",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: {
        command: `node e2e/setup/prepare-database.mjs && npm run build && npm run start -- --port ${E2E_PORT}`,
        url: `${E2E_BASE_URL}/api/health`,
        env: webServerEnvironment,
        reuseExistingServer: !isCi,
        timeout: WEB_SERVER_TIMEOUT_MS,
        stdout: "pipe",
        stderr: "pipe",
    },
});
