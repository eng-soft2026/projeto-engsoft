import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { loadTestEnvironment } from "../integration/helpers/test-environment.js";

const require = createRequire(import.meta.url);
const PRISMA_CLI = require.resolve("prisma/build/index.js");

export default function applyMigrations() {
    const testEnvironment = loadTestEnvironment();
    const result = spawnSync(
        process.execPath,
        [PRISMA_CLI, "migrate", "deploy"],
        {
            env: { ...process.env, ...testEnvironment },
            stdio: "inherit",
        },
    );
    if (result.status !== 0) {
        throw new Error("prisma migrate deploy failed on the test database");
    }
}
