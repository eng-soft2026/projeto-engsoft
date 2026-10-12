import { getPrisma } from "../src/lib/prisma.js";
import { passwordHasher } from "../src/modules/auth/password-hasher.js";
import { createUserRepository } from "../src/repositories/user-repository.js";
import { createUserService } from "../src/services/user-service.js";
import { readAdminSeedInput, seedAdmin } from "./seeds/seed-admin.js";
import { seedDatabase } from "./seeds/seed-database.js";

const ADMIN_SEED_MESSAGES = Object.freeze({
    SKIPPED: "Admin seed skipped: ADMIN_* variables are not set.",
    ALREADY_EXISTS: "Admin user already exists.",
    CREATED: "Admin user created.",
});

const prisma = getPrisma();

try {
    await seedDatabase(prisma);

    const userRepository = createUserRepository(() => prisma);
    const userService = createUserService({ userRepository, passwordHasher });
    const adminSeedResult = await seedAdmin({
        adminInput: readAdminSeedInput(process.env),
        userRepository,
        userService,
    });

    console.log(ADMIN_SEED_MESSAGES[adminSeedResult]);
    console.log("Seed completed.");
} finally {
    await prisma.$disconnect();
}
