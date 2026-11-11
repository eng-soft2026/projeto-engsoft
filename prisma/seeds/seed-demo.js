import { HOTEL_STATUSES } from "../../src/constants/hotel-statuses.js";
import { ValidationError } from "../../src/lib/errors.js";
import { parseWithSchema } from "../../src/lib/validation.js";
import { createHotelSchema } from "../../src/schemas/hotel-schemas.js";
import { createRoomSchema } from "../../src/schemas/room-schemas.js";
import { createRoomTypeSchema } from "../../src/schemas/room-type-schemas.js";
import { createUnitSchema } from "../../src/schemas/unit-schemas.js";
import { userAccountSchema } from "../../src/schemas/user-schemas.js";
import { timeOfDayToDate } from "../../src/utils/time-of-day.js";
import {
    DEMO_HOTELS,
    DEMO_OWNER_EMAIL,
    DEMO_PASSWORD_ENV_KEYS,
    DEMO_USERS,
} from "./demo-data.js";

const PRODUCTION_ENVIRONMENT = "production";
const DEMO_TRANSACTION_TIMEOUT_MS = 30000;

export function assertDemoSeedAllowed(env) {
    if (env.NODE_ENV === PRODUCTION_ENVIRONMENT) {
        throw new Error("The demo seed never runs with NODE_ENV=production.");
    }
}

function parseDemoInput(schema, input, label) {
    try {
        return parseWithSchema(schema, input);
    } catch (error) {
        if (error instanceof ValidationError) {
            throw new Error(`Invalid demo ${label}: ${error.message}`, {
                cause: error,
            });
        }
        throw error;
    }
}

function readDemoPassword(env, role) {
    const key = DEMO_PASSWORD_ENV_KEYS[role];
    const password = env[key] ?? "";
    if (password === "") {
        throw new Error(`Set ${key} in .env to run the demo seed.`);
    }
    const result = userAccountSchema.shape.password.safeParse(password);
    if (!result.success) {
        throw new Error(
            `${key} is not a valid password: ${result.error.issues[0].message}`,
        );
    }
    return password;
}

export function readDemoPasswords(env) {
    return Object.fromEntries(
        Object.keys(DEMO_PASSWORD_ENV_KEYS).map((role) => [
            role,
            readDemoPassword(env, role),
        ]),
    );
}

async function hashMissingUserPasswords(prisma, { passwordHasher, passwords }) {
    const pendingUsers = [];
    for (const user of DEMO_USERS) {
        const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, role: true },
        });
        if (existingUser && existingUser.role !== user.role) {
            throw new Error(
                `${user.email} already exists without the ${user.role} role.`,
            );
        }
        if (!existingUser) {
            const passwordHash = await passwordHasher.hash(
                passwords[user.role],
            );
            pendingUsers.push({ ...user, passwordHash });
        }
    }
    return pendingUsers;
}

async function createPendingUsers(client, pendingUsers) {
    for (const user of pendingUsers) {
        const { cpf } = parseDemoInput(
            userAccountSchema.pick({ cpf: true }),
            { cpf: user.cpf },
            "user",
        );
        const cpfOwner = await client.user.findUnique({
            where: { cpf },
            select: { id: true },
        });
        if (cpfOwner) {
            throw new Error(`The demo CPF of ${user.email} is already taken.`);
        }
        await client.user.create({
            data: {
                name: user.name,
                email: user.email,
                cpf,
                role: user.role,
                passwordHash: user.passwordHash,
            },
        });
    }
}

async function findOwnerId(client) {
    const owner = await client.user.findUnique({
        where: { email: DEMO_OWNER_EMAIL },
        select: { id: true },
    });
    return owner.id;
}

function collectAmenityNames() {
    return [
        ...new Set(
            DEMO_HOTELS.flatMap((hotel) => [
                ...hotel.amenityNames,
                ...hotel.unit.amenityNames,
                ...hotel.roomTypes.flatMap(({ amenityNames }) => amenityNames),
            ]),
        ),
    ];
}

async function loadAmenityIds(client) {
    const names = collectAmenityNames();
    const amenities = await client.amenity.findMany({
        where: { isGlobal: true, createdByUserId: null, name: { in: names } },
        select: { id: true, name: true },
    });
    const idsByName = new Map(amenities.map(({ id, name }) => [name, id]));
    const missingNames = names.filter((name) => !idsByName.has(name));
    if (missingNames.length > 0) {
        throw new Error(
            `Global amenities missing (run npm run db:seed first): ${missingNames.join(", ")}.`,
        );
    }
    return idsByName;
}

function upsertById(delegate, id, data) {
    return delegate.upsert({
        where: { id },
        create: { id, ...data },
        update: {},
    });
}

async function seedAmenityLinks(delegate, ownerKey, ownerId, amenityIds) {
    for (const amenityId of amenityIds) {
        await delegate.upsert({
            where: {
                [`${ownerKey}_amenityId`]: { [ownerKey]: ownerId, amenityId },
            },
            create: { [ownerKey]: ownerId, amenityId },
            update: {},
        });
    }
}

function mapAmenityIds(names, amenityIdsByName) {
    return names.map((name) => amenityIdsByName.get(name));
}

async function seedHotel(client, hotel, ownerUserId, amenityIdsByName) {
    const input = parseDemoInput(createHotelSchema, hotel.input, "hotel");
    await upsertById(client.hotel, hotel.id, {
        ...input,
        ownerUserId,
        status: HOTEL_STATUSES.PUBLISHED,
    });
    await seedAmenityLinks(
        client.hotelAmenity,
        "hotelId",
        hotel.id,
        mapAmenityIds(hotel.amenityNames, amenityIdsByName),
    );
}

async function seedUnit(client, hotel, amenityIdsByName) {
    const { unit } = hotel;
    const { address, phones, checkInTime, checkOutTime, ...unitData } =
        parseDemoInput(createUnitSchema, unit.input, "unit");
    await upsertById(client.hotelUnit, unit.id, {
        ...unitData,
        hotelId: hotel.id,
        checkInTime: timeOfDayToDate(checkInTime),
        checkOutTime: timeOfDayToDate(checkOutTime),
    });
    await client.address.upsert({
        where: { unitId: unit.id },
        create: { ...address, ...unit.coordinates, unitId: unit.id },
        update: {},
    });
    for (const [index, phone] of phones.entries()) {
        await upsertById(client.unitPhone, unit.phoneIds[index], {
            unitId: unit.id,
            phone,
        });
    }
    await seedAmenityLinks(
        client.unitAmenity,
        "unitId",
        unit.id,
        mapAmenityIds(unit.amenityNames, amenityIdsByName),
    );
}

async function seedRoomType(client, hotelId, roomType, amenityIdsByName) {
    const { beds, ...roomTypeData } = parseDemoInput(
        createRoomTypeSchema,
        roomType.input,
        "room type",
    );
    await upsertById(client.roomType, roomType.id, {
        ...roomTypeData,
        hotelId,
    });
    for (const bed of beds) {
        await client.bedConfiguration.upsert({
            where: {
                roomTypeId_bedType: {
                    roomTypeId: roomType.id,
                    bedType: bed.bedType,
                },
            },
            create: { ...bed, roomTypeId: roomType.id },
            update: {},
        });
    }
    await seedAmenityLinks(
        client.roomTypeAmenity,
        "roomTypeId",
        roomType.id,
        mapAmenityIds(roomType.amenityNames, amenityIdsByName),
    );
}

async function seedRoom(client, unitId, room, now) {
    const { price, ...roomData } = parseDemoInput(
        createRoomSchema,
        { ...room.input, roomTypeId: room.roomTypeId },
        "room",
    );
    await upsertById(client.room, room.id, { ...roomData, unitId });
    if (price === undefined) {
        return;
    }
    await upsertById(client.roomPriceHistory, room.priceHistoryId, {
        roomId: room.id,
        price,
        validFrom: now,
        validUntil: null,
    });
}

async function seedHotelTree(client, hotel, context) {
    await seedHotel(client, hotel, context.ownerUserId, context.amenityIds);
    await seedUnit(client, hotel, context.amenityIds);
    for (const roomType of hotel.roomTypes) {
        await seedRoomType(client, hotel.id, roomType, context.amenityIds);
    }
    for (const room of hotel.rooms) {
        await seedRoom(client, hotel.unit.id, room, context.now);
    }
}

export function summarizeDemoData() {
    return {
        users: DEMO_USERS.map(({ email, role }) => ({ email, role })),
        hotelCount: DEMO_HOTELS.length,
        unitCount: DEMO_HOTELS.length,
        roomTypeCount: DEMO_HOTELS.flatMap(({ roomTypes }) => roomTypes).length,
        roomCount: DEMO_HOTELS.flatMap(({ rooms }) => rooms).length,
        cities: DEMO_HOTELS.map(({ unit }) => unit.input.address.city),
    };
}

export async function seedDemo({
    prisma,
    passwordHasher,
    passwords,
    clock = () => new Date(),
}) {
    const pendingUsers = await hashMissingUserPasswords(prisma, {
        passwordHasher,
        passwords,
    });
    const now = clock();

    await prisma.$transaction(
        async (client) => {
            await createPendingUsers(client, pendingUsers);
            const context = {
                ownerUserId: await findOwnerId(client),
                amenityIds: await loadAmenityIds(client),
                now,
            };
            for (const hotel of DEMO_HOTELS) {
                await seedHotelTree(client, hotel, context);
            }
        },
        { timeout: DEMO_TRANSACTION_TIMEOUT_MS },
    );

    return {
        ...summarizeDemoData(),
        createdUserEmails: pendingUsers.map(({ email }) => email),
    };
}
