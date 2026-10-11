import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.ts";

const globalForPrisma = globalThis;

function createPrismaClient() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL is not defined");
    }
    const adapter = new PrismaMariaDb(databaseUrl);
    return new PrismaClient({ adapter });
}

export function getPrisma() {
    if (!globalForPrisma.prismaClient) {
        globalForPrisma.prismaClient = createPrismaClient();
    }
    return globalForPrisma.prismaClient;
}
