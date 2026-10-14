import { readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { SYSTEM_ACCEPTANCE_TYPES } from "../../src/constants/acceptance-types.js";
import { DEFAULT_SYSTEM_SETTINGS } from "../../src/constants/system-settings.js";
import { getPrisma } from "../../src/lib/prisma.js";
import { getRedis } from "../../src/lib/redis.js";
import {
    orderTablesForDeletion,
    resetDatabase,
    seedBaseData,
} from "./helpers/database.js";
import { flushRedis } from "./helpers/redis.js";
import {
    assertTestDatabaseUrl,
    assertTestRedisUrl,
} from "./helpers/test-environment.js";

const MIGRATION_FOLDERS = readdirSync("prisma/migrations", {
    withFileTypes: true,
})
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

async function countUsers() {
    return getPrisma().user.count();
}

function createUser() {
    const suffix = randomUUID();
    return getPrisma().user.create({
        data: {
            name: "Integration User",
            email: `integration-${suffix}@example.com`,
            cpf: suffix.replaceAll("-", "").slice(0, 11),
            passwordHash: "not-a-real-hash",
        },
    });
}

describe("integration test environment", () => {
    beforeEach(async () => {
        await resetDatabase();
        await seedBaseData();
        await flushRedis();
    });

    it("connects to a database whose name ends with _test", async () => {
        const [row] = await getPrisma().$queryRawUnsafe(
            "SELECT DATABASE() AS name",
        );

        expect(row.name).toMatch(/_test$/);
    });

    it("has every migration folder applied", async () => {
        const rows = await getPrisma().$queryRawUnsafe(
            "SELECT migration_name AS name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL",
        );

        expect(rows.map((row) => row.name).sort()).toEqual(
            [...MIGRATION_FOLDERS].sort(),
        );
    });

    it("seeds the base data without duplicates when run twice", async () => {
        await seedBaseData();

        await expect(getPrisma().acceptanceType.count()).resolves.toBe(
            SYSTEM_ACCEPTANCE_TYPES.length,
        );
        await expect(getPrisma().systemSetting.count()).resolves.toBe(
            DEFAULT_SYSTEM_SETTINGS.length,
        );
    });

    it("removes the rows of a previous test on reset", async () => {
        await createUser();
        expect(await countUsers()).toBe(1);

        await resetDatabase();

        expect(await countUsers()).toBe(0);
        await expect(getPrisma().acceptanceType.count()).resolves.toBe(0);
    });

    it("starts each test with an empty user table", async () => {
        expect(await countUsers()).toBe(0);
    });

    it("flushes the dedicated Redis database", async () => {
        const client = await getRedis();
        await client.set("integration:smoke", "1");

        await flushRedis();

        await expect(client.exists("integration:smoke")).resolves.toBe(0);
    });
});

describe("test environment guards", () => {
    it("rejects a database name without the _test suffix", () => {
        expect(() =>
            assertTestDatabaseUrl(
                "mysql://root:root@127.0.0.1:3306/hotel_booking",
            ),
        ).toThrow("_test");
    });

    it("rejects a missing database url", () => {
        expect(() => assertTestDatabaseUrl(undefined)).toThrow("DATABASE_URL");
    });

    it("accepts a database name ending with _test", () => {
        expect(() =>
            assertTestDatabaseUrl(
                "mysql://root:root@127.0.0.1:3306/hotel_booking_test",
            ),
        ).not.toThrow();
    });

    it("rejects the default Redis database", () => {
        expect(() => assertTestRedisUrl("redis://127.0.0.1:6379")).toThrow();
        expect(() => assertTestRedisUrl("redis://127.0.0.1:6379/0")).toThrow();
    });

    it("accepts a dedicated Redis database index", () => {
        expect(() =>
            assertTestRedisUrl("redis://127.0.0.1:6379/15"),
        ).not.toThrow();
    });

    it("orders child tables before their parents", () => {
        const ordered = orderTablesForDeletion(
            ["user", "hotel", "hotel_unit"],
            [
                { child: "hotel", parent: "user" },
                { child: "hotel_unit", parent: "hotel" },
            ],
        );

        expect(ordered).toEqual(["hotel_unit", "hotel", "user"]);
    });

    it("fails on a foreign key cycle", () => {
        expect(() =>
            orderTablesForDeletion(
                ["a", "b"],
                [
                    { child: "a", parent: "b" },
                    { child: "b", parent: "a" },
                ],
            ),
        ).toThrow("cycle");
    });
});
