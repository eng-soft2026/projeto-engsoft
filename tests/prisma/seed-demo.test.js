import { describe, expect, it, vi } from "vitest";
import { PrismaClient } from "../../src/generated/prisma/client.ts";
import { GLOBAL_AMENITY_NAMES } from "../../src/constants/global-amenities.js";
import { HOTEL_STATUSES } from "../../src/constants/hotel-statuses.js";
import { USER_ROLES } from "../../src/constants/user-roles.js";
import { parseWithSchema } from "../../src/lib/validation.js";
import { createHotelSchema } from "../../src/schemas/hotel-schemas.js";
import { createRoomSchema } from "../../src/schemas/room-schemas.js";
import { createRoomTypeSchema } from "../../src/schemas/room-type-schemas.js";
import { createUnitSchema } from "../../src/schemas/unit-schemas.js";
import { userAccountSchema } from "../../src/schemas/user-schemas.js";
import { isValidCpf } from "../../src/utils/cpf.js";
import {
    DEMO_HOTELS,
    DEMO_OWNER_EMAIL,
    DEMO_PASSWORD_ENV_KEYS,
    DEMO_USERS,
} from "../../prisma/seeds/demo-data.js";
import {
    assertDemoSeedAllowed,
    readDemoPasswords,
    seedDemo,
} from "../../prisma/seeds/seed-demo.js";

const MANAGER_PASSWORD = "senha-demo-gestor-1";
const CUSTOMER_PASSWORD = "senha-demo-cliente-1";
const PASSWORDS = Object.freeze({
    [USER_ROLES.MANAGER]: MANAGER_PASSWORD,
    [USER_ROLES.CUSTOMER]: CUSTOMER_PASSWORD,
});
const DATABASE_REACHED = "database reached";
const QUERY_METHODS = ["findUnique", "findMany", "create", "upsert"];
const FIXED_NOW = new Date("2026-11-11T12:00:00.000Z");
const MODELS = [
    "user",
    "amenity",
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

function isCompositeKey(value) {
    return value !== null && typeof value === "object" && !("in" in value);
}

function flattenWhere(where) {
    return Object.entries(where).flatMap(([key, value]) =>
        isCompositeKey(value) ? Object.entries(value) : [[key, value]],
    );
}

function matchesWhere(record, where) {
    return flattenWhere(where).every(([key, value]) =>
        value && typeof value === "object" && "in" in value
            ? value.in.includes(record[key])
            : record[key] === value,
    );
}

function createFakeDelegate(records) {
    return {
        records,
        findUnique: vi.fn(
            async ({ where }) =>
                records.find((record) => matchesWhere(record, where)) ?? null,
        ),
        findMany: vi.fn(async ({ where }) =>
            records.filter((record) => matchesWhere(record, where)),
        ),
        create: vi.fn(async ({ data }) => {
            const record = { id: data.id ?? crypto.randomUUID(), ...data };
            records.push(record);
            return record;
        }),
        upsert: vi.fn(async ({ where, create }) => {
            const existing = records.find((record) =>
                matchesWhere(record, where),
            );
            if (existing) {
                return existing;
            }
            const record = { ...create };
            records.push(record);
            return record;
        }),
    };
}

function createFakePrisma({ users = [] } = {}) {
    const prisma = Object.fromEntries(
        MODELS.map((model) => [model, createFakeDelegate([])]),
    );
    prisma.user.records.push(...users);
    prisma.amenity.records.push(
        ...GLOBAL_AMENITY_NAMES.map((name) => ({
            id: crypto.randomUUID(),
            name,
            isGlobal: true,
            createdByUserId: null,
        })),
    );
    prisma.$transaction = vi.fn(async (callback) => callback(prisma));
    return prisma;
}

function createFakeHasher() {
    return { hash: vi.fn(async (password) => `hash:${password.length}`) };
}

function countRecords(prisma) {
    return Object.fromEntries(
        MODELS.map((model) => [model, prisma[model].records.length]),
    );
}

function createClientWithoutDatabase() {
    const reachDatabase = async () => {
        throw new Error(DATABASE_REACHED);
    };
    const connection = {
        provider: "mysql",
        adapterName: "no-database",
        queryRaw: reachDatabase,
        executeRaw: reachDatabase,
        executeScript: reachDatabase,
        startTransaction: reachDatabase,
        dispose: async () => {},
    };
    return new PrismaClient({
        adapter: {
            provider: "mysql",
            adapterName: "no-database",
            connect: async () => connection,
        },
    });
}

function collectQueries(prisma) {
    return MODELS.flatMap((model) =>
        QUERY_METHODS.flatMap((method) =>
            prisma[model][method].mock.calls.map(([args]) => ({
                model,
                method,
                args,
            })),
        ),
    );
}

function runSeed(prisma, passwordHasher = createFakeHasher()) {
    return seedDemo({
        prisma,
        passwordHasher,
        passwords: PASSWORDS,
        clock: () => FIXED_NOW,
    });
}

describe("assertDemoSeedAllowed", () => {
    it("refuses production", () => {
        expect(() => assertDemoSeedAllowed({ NODE_ENV: "production" })).toThrow(
            /production/,
        );
    });

    it.each([undefined, "development", "test"])(
        "allows NODE_ENV=%s",
        (nodeEnv) => {
            expect(() =>
                assertDemoSeedAllowed({ NODE_ENV: nodeEnv }),
            ).not.toThrow();
        },
    );
});

describe("readDemoPasswords", () => {
    const validEnv = {
        DEMO_MANAGER_PASSWORD: MANAGER_PASSWORD,
        DEMO_CUSTOMER_PASSWORD: CUSTOMER_PASSWORD,
    };

    it("reads one password per demo role", () => {
        expect(readDemoPasswords(validEnv)).toEqual(PASSWORDS);
    });

    it.each(Object.values(DEMO_PASSWORD_ENV_KEYS))(
        "names the missing variable %s",
        (key) => {
            expect(() => readDemoPasswords({ ...validEnv, [key]: "" })).toThrow(
                key,
            );
        },
    );

    it("refuses a weak password without echoing it", () => {
        const weakPassword = "fraca";
        let message = "";
        try {
            readDemoPasswords({
                ...validEnv,
                DEMO_MANAGER_PASSWORD: weakPassword,
            });
        } catch (error) {
            message = error.message;
        }

        expect(message).toContain("DEMO_MANAGER_PASSWORD");
        expect(message).not.toContain(weakPassword);
    });
});

describe("demo data", () => {
    it("has valid users, with the owner as a manager", () => {
        for (const user of DEMO_USERS) {
            expect(isValidCpf(user.cpf)).toBe(true);
            expect(() =>
                parseWithSchema(userAccountSchema, {
                    ...user,
                    password: PASSWORDS[user.role],
                }),
            ).not.toThrow();
        }
        expect(DEMO_USERS.map(({ role }) => role).sort()).toEqual(
            [USER_ROLES.CUSTOMER, USER_ROLES.MANAGER].sort(),
        );
        expect(
            DEMO_USERS.find(({ email }) => email === DEMO_OWNER_EMAIL).role,
        ).toBe(USER_ROLES.MANAGER);
    });

    it("passes the create schemas of the API", () => {
        for (const hotel of DEMO_HOTELS) {
            expect(() =>
                parseWithSchema(createHotelSchema, hotel.input),
            ).not.toThrow();
            expect(() =>
                parseWithSchema(createUnitSchema, hotel.unit.input),
            ).not.toThrow();
            for (const roomType of hotel.roomTypes) {
                expect(() =>
                    parseWithSchema(createRoomTypeSchema, roomType.input),
                ).not.toThrow();
            }
            for (const room of hotel.rooms) {
                expect(() =>
                    parseWithSchema(createRoomSchema, {
                        ...room.input,
                        roomTypeId: room.roomTypeId,
                    }),
                ).not.toThrow();
            }
        }
    });

    it("covers two cities, coordinates, at least six rooms and prices", () => {
        const cities = DEMO_HOTELS.map(({ unit }) => unit.input.address.city);
        const rooms = DEMO_HOTELS.flatMap((hotel) => hotel.rooms);

        expect(DEMO_HOTELS).toHaveLength(2);
        expect(new Set(cities).size).toBe(2);
        expect(rooms.length).toBeGreaterThanOrEqual(6);
        expect(rooms.some(({ input }) => input.price)).toBe(true);
        for (const { unit } of DEMO_HOTELS) {
            expect(unit.coordinates.latitude).toMatch(/^-?\d{1,3}\.\d{6}$/);
            expect(unit.coordinates.longitude).toMatch(/^-?\d{1,3}\.\d{6}$/);
        }
    });

    it("uses room types of the same hotel and only global amenities", () => {
        for (const hotel of DEMO_HOTELS) {
            const typeIds = hotel.roomTypes.map(({ id }) => id);
            for (const room of hotel.rooms) {
                expect(typeIds).toContain(room.roomTypeId);
            }
            const names = [
                ...hotel.amenityNames,
                ...hotel.unit.amenityNames,
                ...hotel.roomTypes.flatMap(({ amenityNames }) => amenityNames),
            ];
            expect(GLOBAL_AMENITY_NAMES).toEqual(expect.arrayContaining(names));
        }
    });

    it("has unique fixed ids", () => {
        const ids = DEMO_HOTELS.flatMap((hotel) => [
            hotel.id,
            hotel.unit.id,
            ...hotel.unit.phoneIds,
            ...hotel.roomTypes.map(({ id }) => id),
            ...hotel.rooms.flatMap(({ id, priceHistoryId }) =>
                priceHistoryId ? [id, priceHistoryId] : [id],
            ),
        ]);

        expect(new Set(ids).size).toBe(ids.length);
    });
});

describe("seedDemo", () => {
    it("creates the users, published hotels, units, rooms and prices", async () => {
        const prisma = createFakePrisma();
        const passwordHasher = createFakeHasher();

        const summary = await runSeed(prisma, passwordHasher);

        expect(summary.createdUserEmails.sort()).toEqual(
            DEMO_USERS.map(({ email }) => email).sort(),
        );
        expect(passwordHasher.hash).toHaveBeenCalledWith(MANAGER_PASSWORD);
        expect(passwordHasher.hash).toHaveBeenCalledWith(CUSTOMER_PASSWORD);
        expect(JSON.stringify(prisma.user.records)).not.toContain(
            MANAGER_PASSWORD,
        );
        expect(JSON.stringify(summary)).not.toContain(MANAGER_PASSWORD);

        const owner = prisma.user.records.find(
            ({ email }) => email === DEMO_OWNER_EMAIL,
        );
        expect(prisma.hotel.records).toHaveLength(2);
        for (const hotel of prisma.hotel.records) {
            expect(hotel.status).toBe(HOTEL_STATUSES.PUBLISHED);
            expect(hotel.ownerUserId).toBe(owner.id);
        }
        expect(prisma.hotelUnit.records).toHaveLength(2);
        expect(prisma.hotelUnit.records[0].checkInTime).toEqual(
            new Date("1970-01-01T14:00:00.000Z"),
        );
        for (const address of prisma.address.records) {
            expect(address.latitude).not.toBeNull();
            expect(address.longitude).not.toBeNull();
            expect(address.zipCode).toMatch(/^\d{8}$/);
        }
        expect(prisma.unitPhone.records[0].phone).toBe("1130001000");
        expect(prisma.roomType.records).toHaveLength(4);
        expect(prisma.room.records).toHaveLength(8);
        expect(prisma.roomPriceHistory.records).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    price: "590.00",
                    validFrom: FIXED_NOW,
                    validUntil: null,
                }),
            ]),
        );
        expect(prisma.hotelAmenity.records.length).toBeGreaterThan(0);
        expect(prisma.unitAmenity.records.length).toBeGreaterThan(0);
        expect(prisma.roomTypeAmenity.records.length).toBeGreaterThan(0);
    });

    it("is idempotent: a second run creates nothing", async () => {
        const prisma = createFakePrisma();
        await runSeed(prisma);
        const countsAfterFirstRun = countRecords(prisma);
        const passwordHasher = createFakeHasher();

        const summary = await runSeed(prisma, passwordHasher);

        expect(countRecords(prisma)).toEqual(countsAfterFirstRun);
        expect(summary.createdUserEmails).toEqual([]);
        expect(passwordHasher.hash).not.toHaveBeenCalled();
    });

    it("never overwrites existing demo rows", async () => {
        const prisma = createFakePrisma();
        await runSeed(prisma);
        const [hotel] = prisma.hotel.records;
        hotel.name = "Nome alterado";

        await runSeed(prisma);

        expect(hotel.name).toBe("Nome alterado");
        for (const model of MODELS) {
            for (const [args] of prisma[model].upsert.mock.calls) {
                expect(args.update).toEqual({});
            }
        }
    });

    it("refuses a demo e-mail that belongs to another role", async () => {
        const prisma = createFakePrisma({
            users: [
                {
                    id: crypto.randomUUID(),
                    email: DEMO_OWNER_EMAIL,
                    role: USER_ROLES.CUSTOMER,
                },
            ],
        });

        await expect(runSeed(prisma)).rejects.toThrow(DEMO_OWNER_EMAIL);
        expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("refuses a demo CPF taken by another user", async () => {
        const [manager] = DEMO_USERS;
        const prisma = createFakePrisma({
            users: [
                {
                    id: crypto.randomUUID(),
                    email: "outra.pessoa@example.com",
                    cpf: manager.cpf,
                    role: USER_ROLES.CUSTOMER,
                },
            ],
        });

        await expect(runSeed(prisma)).rejects.toThrow(/CPF/);
    });

    it("asks for the base seed when a global amenity is missing", async () => {
        const prisma = createFakePrisma();
        prisma.amenity.records.length = 0;

        await expect(runSeed(prisma)).rejects.toThrow(/npm run db:seed/);
    });

    it("sends only queries the real Prisma client accepts", async () => {
        const fakePrisma = createFakePrisma();
        await runSeed(fakePrisma);
        const client = createClientWithoutDatabase();
        const queries = collectQueries(fakePrisma);

        expect(queries.length).toBeGreaterThan(0);
        for (const { model, method, args } of queries) {
            await expect(
                client[model][method](args),
                `${model}.${method}`,
            ).rejects.toThrow(DATABASE_REACHED);
        }
    });
});
