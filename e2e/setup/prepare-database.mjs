import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { seedDatabase } from "../../prisma/seeds/seed-database.js";
import { getPrisma } from "../../src/lib/prisma.js";
import { passwordHasher } from "../../src/modules/auth/password-hasher.js";
import { createUserRepository } from "../../src/repositories/user-repository.js";
import { createUserService } from "../../src/services/user-service.js";
import { loadTestEnvironment } from "../../tests/integration/helpers/test-environment.js";
import { E2E_USERS } from "../support/test-users.js";

const require = createRequire(import.meta.url);
const PRISMA_CLI = require.resolve("prisma/build/index.js");

function applyMigrations() {
    const result = spawnSync(
        process.execPath,
        [PRISMA_CLI, "migrate", "deploy"],
        { env: process.env, stdio: "inherit" },
    );
    if (result.status !== 0) {
        throw new Error("prisma migrate deploy failed on the e2e database");
    }
}

async function resetExistingUser(userRepository, existingUser, user) {
    const passwordHash = await passwordHasher.hash(user.password);
    await userRepository.update(existingUser.id, {
        name: user.name,
        role: user.role,
        isActive: true,
        passwordHash,
    });
}

async function ensureE2eUser({ userRepository, userService }, user) {
    const existingUser = await userRepository.findByEmail(user.email);
    if (existingUser) {
        await resetExistingUser(userRepository, existingUser, user);
        return;
    }
    await userService.createUser(user);
}

async function prepareDatabase() {
    Object.assign(process.env, loadTestEnvironment());
    applyMigrations();

    const prisma = getPrisma();
    try {
        await seedDatabase(prisma);
        const userRepository = createUserRepository(() => prisma);
        const userService = createUserService({
            userRepository,
            passwordHasher,
        });
        for (const user of Object.values(E2E_USERS)) {
            await ensureE2eUser({ userRepository, userService }, user);
        }
    } finally {
        await prisma.$disconnect();
    }
}

await prepareDatabase();
