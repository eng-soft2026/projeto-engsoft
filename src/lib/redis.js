import { createClient } from "redis";

const globalForRedis = globalThis;

function createRedisClient() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        throw new Error("REDIS_URL is not defined");
    }
    const client = createClient({ url: redisUrl });
    client.on("error", (error) => {
        console.error("Redis client error:", error.message);
    });
    return client;
}

export async function getRedis() {
    if (!globalForRedis.redisClient) {
        globalForRedis.redisClient = createRedisClient();
    }
    const client = globalForRedis.redisClient;
    if (!client.isOpen) {
        await client.connect();
    }
    return client;
}
