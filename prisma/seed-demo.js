import { getPrisma } from "../src/lib/prisma.js";
import { passwordHasher } from "../src/modules/auth/password-hasher.js";
import { seedDatabase } from "./seeds/seed-database.js";
import {
    assertDemoSeedAllowed,
    readDemoPasswords,
    seedDemo,
} from "./seeds/seed-demo.js";

assertDemoSeedAllowed(process.env);
const passwords = readDemoPasswords(process.env);
const prisma = getPrisma();

try {
    await seedDatabase(prisma);
    const summary = await seedDemo({ prisma, passwordHasher, passwords });

    console.log(
        `Demo seed completed: ${summary.hotelCount} published hotels (${summary.cities.join(", ")}), ${summary.roomTypeCount} room types, ${summary.roomCount} rooms.`,
    );
    for (const { email, role } of summary.users) {
        const state = summary.createdUserEmails.includes(email)
            ? "created"
            : "already existed";
        console.log(`Demo ${role}: ${email} (${state}).`);
    }
} finally {
    await prisma.$disconnect();
}
