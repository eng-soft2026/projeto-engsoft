import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

export const TEST_ENV_FILE = ".env.test";
const TEST_DATABASE_SUFFIX = "_test";
const DEFAULT_REDIS_DATABASE_INDEX = 0;

function readEnvFile(path) {
    if (!existsSync(path)) {
        return {};
    }
    return parseEnv(readFileSync(path, "utf8"));
}

function readDatabaseName(databaseUrl) {
    try {
        return decodeURIComponent(new URL(databaseUrl).pathname.slice(1));
    } catch {
        return "";
    }
}

function readRedisDatabaseIndex(redisUrl) {
    try {
        const path = new URL(redisUrl).pathname.slice(1);
        return path === "" ? DEFAULT_REDIS_DATABASE_INDEX : Number(path);
    } catch {
        return Number.NaN;
    }
}

export function assertTestDatabaseUrl(databaseUrl) {
    if (!databaseUrl) {
        throw new Error("Integration tests need DATABASE_URL in .env.test");
    }
    if (!readDatabaseName(databaseUrl).endsWith(TEST_DATABASE_SUFFIX)) {
        throw new Error(
            `Integration tests refuse a database whose name does not end with ${TEST_DATABASE_SUFFIX}`,
        );
    }
}

export function assertTestRedisUrl(redisUrl) {
    if (!redisUrl) {
        throw new Error("Integration tests need REDIS_URL in .env.test");
    }
    const databaseIndex = readRedisDatabaseIndex(redisUrl);
    if (
        !Number.isInteger(databaseIndex) ||
        databaseIndex <= DEFAULT_REDIS_DATABASE_INDEX
    ) {
        throw new Error(
            "Integration tests need a dedicated Redis database index greater than 0 in REDIS_URL",
        );
    }
}

export function loadTestEnvironment(path = TEST_ENV_FILE, env = process.env) {
    const fileValues = readEnvFile(path);
    const testEnvironment = {
        DATABASE_URL: fileValues.DATABASE_URL ?? env.DATABASE_URL,
        REDIS_URL: fileValues.REDIS_URL ?? env.REDIS_URL,
    };
    assertTestDatabaseUrl(testEnvironment.DATABASE_URL);
    assertTestRedisUrl(testEnvironment.REDIS_URL);
    return testEnvironment;
}
