import { getPrisma } from "../../lib/prisma.js";
import { getRedis } from "../../lib/redis.js";

export async function checkMysql() {
    await getPrisma().$queryRaw`SELECT 1`;
}

export async function checkRedis() {
    const client = await getRedis();
    await client.ping();
}

export const readinessProbes = Object.freeze({
    mysql: checkMysql,
    redis: checkRedis,
});
