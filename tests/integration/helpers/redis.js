import { getRedis } from "../../../src/lib/redis.js";
import { assertTestRedisUrl } from "./test-environment.js";

export async function flushRedis() {
    assertTestRedisUrl(process.env.REDIS_URL);
    const client = await getRedis();
    await client.flushDb();
}
