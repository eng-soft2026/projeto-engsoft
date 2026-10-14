import { afterAll } from "vitest";

afterAll(async () => {
    const { prismaClient, redisClient } = globalThis;
    if (prismaClient) {
        await prismaClient.$disconnect();
        globalThis.prismaClient = undefined;
    }
    if (redisClient?.isOpen) {
        await redisClient.quit();
    }
    globalThis.redisClient = undefined;
});
