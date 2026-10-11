import { getPrisma } from "../src/lib/prisma.js";
import { seedDatabase } from "./seeds/seed-database.js";

const prisma = getPrisma();

try {
    await seedDatabase(prisma);
    console.log("Seed completed.");
} finally {
    await prisma.$disconnect();
}
