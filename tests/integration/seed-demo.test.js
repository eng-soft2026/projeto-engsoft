import { beforeEach, describe, expect, it } from "vitest";
import { HOTEL_STATUSES } from "../../src/constants/hotel-statuses.js";
import { USER_ROLES } from "../../src/constants/user-roles.js";
import { getPrisma } from "../../src/lib/prisma.js";
import { passwordHasher } from "../../src/modules/auth/password-hasher.js";
import { DEMO_USERS } from "../../prisma/seeds/demo-data.js";
import { seedDemo } from "../../prisma/seeds/seed-demo.js";
import { resetDatabase, seedBaseData } from "./helpers/database.js";
import { flushRedis } from "./helpers/redis.js";

const PASSWORDS = Object.freeze({
    [USER_ROLES.MANAGER]: "senha-demo-gestor-1",
    [USER_ROLES.CUSTOMER]: "senha-demo-cliente-1",
});

const COUNTED_MODELS = [
    "user",
    "hotel",
    "hotelAmenity",
    "hotelUnit",
    "address",
    "unitPhone",
    "unitAmenity",
    "roomType",
    "bedConfiguration",
    "roomTypeAmenity",
    "room",
    "roomPriceHistory",
];

function runSeed() {
    return seedDemo({
        prisma: getPrisma(),
        passwordHasher,
        passwords: PASSWORDS,
    });
}

async function countRows() {
    const prisma = getPrisma();
    const counts = await Promise.all(
        COUNTED_MODELS.map((model) => prisma[model].count()),
    );
    return Object.fromEntries(
        COUNTED_MODELS.map((model, index) => [model, counts[index]]),
    );
}

describe("seedDemo on MySQL", () => {
    beforeEach(async () => {
        await resetDatabase();
        await seedBaseData();
        await flushRedis();
    });

    it("creates published hotels with geocoded units, rooms and prices", async () => {
        await runSeed();
        const prisma = getPrisma();

        const hotels = await prisma.hotel.findMany({
            include: {
                units: { include: { address: true, rooms: true } },
                roomTypes: true,
            },
        });
        expect(hotels).toHaveLength(2);
        expect(
            hotels.every(({ status }) => status === HOTEL_STATUSES.PUBLISHED),
        ).toBe(true);
        const units = hotels.flatMap(({ units }) => units);
        expect(new Set(units.map(({ address }) => address.city)).size).toBe(2);
        for (const { address } of units) {
            expect(address.latitude).not.toBeNull();
            expect(address.longitude).not.toBeNull();
        }
        expect(
            units.flatMap(({ rooms }) => rooms).length,
        ).toBeGreaterThanOrEqual(6);
        expect(
            await prisma.roomPriceHistory.count({
                where: { validUntil: null },
            }),
        ).toBe(2);

        const manager = await prisma.user.findUnique({
            where: { email: DEMO_USERS[0].email },
        });
        expect(
            await passwordHasher.verify(
                PASSWORDS[manager.role],
                manager.passwordHash,
            ),
        ).toBe(true);
    });

    it("is idempotent", async () => {
        await runSeed();
        const countsAfterFirstRun = await countRows();

        const summary = await runSeed();

        expect(await countRows()).toEqual(countsAfterFirstRun);
        expect(summary.createdUserEmails).toEqual([]);
    });
});
