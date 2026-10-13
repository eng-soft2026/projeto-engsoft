import { describe, expect, it } from "vitest";
import { PrismaClient } from "../../src/generated/prisma/client.ts";
import { createTransactionRunner } from "../../src/lib/transaction.js";
import { createAmenityRepository } from "../../src/repositories/amenity-repository.js";
import { createAuditLogRepository } from "../../src/repositories/audit-log-repository.js";
import { createHotelAcceptanceRepository } from "../../src/repositories/hotel-acceptance-repository.js";
import { createHotelManagerRepository } from "../../src/repositories/hotel-manager-repository.js";
import { createHotelPolicyRepository } from "../../src/repositories/hotel-policy-repository.js";
import { createHotelRepository } from "../../src/repositories/hotel-repository.js";
import { createHotelReviewNoteRepository } from "../../src/repositories/hotel-review-note-repository.js";
import { createRoomRepository } from "../../src/repositories/room-repository.js";
import { createRoomTypeRepository } from "../../src/repositories/room-type-repository.js";
import { createSystemSettingRepository } from "../../src/repositories/system-setting-repository.js";
import { createUnitRepository } from "../../src/repositories/unit-repository.js";

const DATABASE_REACHED = "database reached";
const ID = "3f1c2a4e-8b7d-4c6a-9e21-5d0b7a1c9f33";

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
    const adapter = {
        provider: "mysql",
        adapterName: "no-database",
        connect: async () => connection,
    };
    return new PrismaClient({ adapter });
}

const prisma = createClientWithoutDatabase();
const hotels = createHotelRepository(() => prisma);
const hotelManagers = createHotelManagerRepository(() => prisma);
const reviewNotes = createHotelReviewNoteRepository(() => prisma);
const auditLogs = createAuditLogRepository(() => prisma);
const units = createUnitRepository(() => prisma);
const systemSettings = createSystemSettingRepository(() => prisma);
const roomTypes = createRoomTypeRepository(() => prisma);
const rooms = createRoomRepository(() => prisma);
const amenities = createAmenityRepository(() => prisma);
const acceptances = createHotelAcceptanceRepository(() => prisma);
const policies = createHotelPolicyRepository(() => prisma);
const transactions = createTransactionRunner(() => prisma);

const NEW_HOTEL = {
    ownerUserId: ID,
    name: "Hotel Mar Azul",
    description: "Hotel à beira-mar.",
    category: "4 estrelas",
    cnpj: "11222333000181",
    email: "contato@marazul.example.com",
    status: "DRAFT",
};

const NEW_UNIT = {
    hotelId: ID,
    name: "Unidade Paulista",
    email: "paulista@marazul.example.com",
    checkInTime: new Date("1970-01-01T14:00:00.000Z"),
    checkOutTime: new Date("1970-01-01T12:00:00.000Z"),
    overbookingPercentage: 5,
    address: {
        zipCode: "01310100",
        street: "Avenida Paulista",
        number: "1000",
        complement: null,
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
    },
    phones: ["11912345678"],
};

const NEW_ROOM_TYPE = {
    hotelId: ID,
    name: "Suíte Master",
    description: "Suíte com vista para o mar.",
    maxGuests: 3,
    areaM2: "42.50",
    defaultPrice: "350.00",
    beds: [
        { bedType: "KING", quantity: 1 },
        { bedType: "SOFA_BED", quantity: 1 },
    ],
};

const NEW_ROOM = {
    unitId: ID,
    roomTypeId: ID,
    number: "101",
    floor: 1,
    status: "AVAILABLE",
    isAccessible: false,
    administrativeNotes: null,
    price: "299.90",
    validFrom: new Date("2026-10-13T12:00:00.000Z"),
};

const AUDIT_ENTRY = {
    userId: ID,
    action: "APPROVE",
    entityType: "HOTEL",
    entityId: ID,
    beforeData: { status: "UNDER_REVIEW" },
    afterData: { status: "PUBLISHED" },
    reason: "Documentos conferidos.",
    result: "SUCCESS",
    requestId: "req-1",
    ipAddress: "203.0.113.7",
    userAgent: "Mozilla/5.0",
};

const QUERIES = [
    ["hotel.create", () => hotels.create(NEW_HOTEL)],
    ["hotel.findById", () => hotels.findById(ID)],
    ["hotel.findByIdWithReviewNotes", () => hotels.findByIdWithReviewNotes(ID)],
    ["hotel.listByManager", () => hotels.listByManager(ID)],
    ["hotelManager.exists", () => hotelManagers.exists(ID, ID)],
    ["hotelManager.create", () => hotelManagers.create(ID, ID)],
    ["hotelManager.delete", () => hotelManagers.delete(ID, ID)],
    [
        "hotel.listForReview with a status",
        () => hotels.listForReview({ status: "UNDER_REVIEW" }),
    ],
    ["hotel.listForReview without a status", () => hotels.listForReview({})],
    [
        "hotel.updateFieldsIfStatus",
        () =>
            hotels.updateFieldsIfStatus(ID, "DRAFT", {
                name: "Novo nome",
                cnpj: "12ABC34501DE35",
                description: undefined,
            }),
    ],
    [
        "hotel.updateStatusIfCurrent",
        () => hotels.updateStatusIfCurrent(ID, "UNDER_REVIEW", "PUBLISHED"),
    ],
    [
        "hotelReviewNote.create",
        () =>
            reviewNotes.create({
                hotelId: ID,
                adminUserId: ID,
                fromStatus: "UNDER_REVIEW",
                toStatus: "DRAFT",
                notes: "Corrigir o CNPJ.",
            }),
    ],
    ["auditLog.create", () => auditLogs.create(AUDIT_ENTRY)],
    [
        "auditLog.create without snapshots, user or context",
        () =>
            auditLogs.create({
                userId: null,
                action: "CREATE",
                entityType: "HOTEL",
                entityId: ID,
                beforeData: null,
                afterData: undefined,
                reason: null,
                result: "SUCCESS",
                requestId: null,
                ipAddress: null,
                userAgent: null,
            }),
    ],
    ["hotelUnit.create", () => units.create(NEW_UNIT)],
    ["hotelUnit.findById", () => units.findById(ID)],
    ["hotelUnit.findByIdWithHotel", () => units.findByIdWithHotel(ID)],
    ["hotelUnit.listByHotel", () => units.listByHotel(ID)],
    [
        "hotelUnit.updateFields",
        () =>
            units.updateFields(ID, {
                name: "Novo nome",
                checkInTime: new Date("1970-01-01T15:00:00.000Z"),
                overbookingPercentage: 0,
                isActive: false,
                updatedAt: new Date(),
            }),
    ],
    ["address.update", () => units.replaceAddress(ID, NEW_UNIT.address)],
    ["unitPhone.deleteMany", () => units.replacePhones(ID, ["11912345678"])],
    ["roomType.create", () => roomTypes.create(NEW_ROOM_TYPE)],
    ["roomType.findById", () => roomTypes.findById(ID)],
    ["roomType.findByIdWithHotel", () => roomTypes.findByIdWithHotel(ID)],
    ["roomType.listByHotel", () => roomTypes.listByHotel(ID)],
    [
        "roomType.updateFields",
        () =>
            roomTypes.updateFields(ID, {
                name: "Suíte",
                areaM2: "40.00",
                defaultPrice: "400.00",
                isActive: false,
                updatedAt: new Date(),
            }),
    ],
    [
        "bedConfiguration.deleteMany",
        () => roomTypes.replaceBeds(ID, [{ bedType: "QUEEN", quantity: 2 }]),
    ],
    [
        "room.count (room type references)",
        () => roomTypes.hasRoomReferences(ID),
    ],
    ["bedConfiguration.deleteMany (delete)", () => roomTypes.deleteById(ID)],
    ["room.create", () => rooms.create(NEW_ROOM)],
    [
        "room.create without price",
        () => rooms.create({ ...NEW_ROOM, price: undefined }),
    ],
    ["room.findByIdWithAccess", () => rooms.findByIdWithAccess(ID)],
    ["room.listByUnit", () => rooms.listByUnit(ID)],
    [
        "room.updateFields",
        () =>
            rooms.updateFields(ID, {
                number: "102",
                floor: 2,
                status: "MAINTENANCE",
                isAccessible: true,
                administrativeNotes: "Pintura.",
                isActive: false,
                updatedAt: new Date(),
            }),
    ],
    [
        "roomTypeHistory.updateMany",
        () => rooms.changeRoomType(ID, ID, new Date()),
    ],
    [
        "roomPriceHistory.updateMany",
        () => rooms.changePrice(ID, "310.00", new Date()),
    ],
    ["roomPriceHistory.count", () => rooms.hasHistory(ID)],
    ["roomTypeHistory.deleteMany", () => rooms.deleteById(ID)],
    [
        "amenity.create",
        () => amenities.create({ createdByUserId: ID, name: "Piscina" }),
    ],
    ["amenity.findMany (available)", () => amenities.listAvailableTo(ID)],
    [
        "amenity.findMany (by ids)",
        () => amenities.findIdsAvailableTo([ID], [ID]),
    ],
    ["amenity.findFirst", () => amenities.existsVisibleByName("Piscina", ID)],
    ["hotelAmenity.findMany", () => amenities.listAssociated("hotel", ID)],
    ["unitAmenity.findMany", () => amenities.listAssociated("unit", ID)],
    [
        "roomTypeAmenity.findMany",
        () => amenities.listAssociated("roomType", ID),
    ],
    ["roomAmenity.findMany", () => amenities.listAssociated("room", ID)],
    [
        "hotelAmenity.deleteMany",
        () => amenities.replaceAssociations("hotel", ID, [ID]),
    ],
    [
        "unitAmenity.deleteMany",
        () => amenities.replaceAssociations("unit", ID, [ID]),
    ],
    [
        "roomTypeAmenity.deleteMany",
        () => amenities.replaceAssociations("roomType", ID, [ID]),
    ],
    [
        "roomAmenity.deleteMany",
        () => amenities.replaceAssociations("room", ID, [ID]),
    ],
    ["acceptanceType.findMany", () => acceptances.listTypes()],
    ["hotelAcceptance.findMany", () => acceptances.listByHotel(ID)],
    [
        "hotelAcceptance.deleteMany",
        () =>
            acceptances.replaceAll(ID, [
                {
                    acceptanceTypeId: ID,
                    customLabel: null,
                    isAllowed: true,
                    details: null,
                },
            ]),
    ],
    [
        "hotelPolicy.create",
        () =>
            policies.create({
                hotelId: ID,
                type: "PARKING",
                title: "Estacionamento",
                description: "Gratuito.",
            }),
    ],
    ["hotelPolicy.findUnique", () => policies.findByIdWithHotel(ID)],
    ["hotelPolicy.findMany", () => policies.listByHotel(ID)],
    [
        "hotelPolicy.update",
        () =>
            policies.updateFields(ID, {
                type: "OTHER",
                title: "Novo",
                description: "Texto.",
                isActive: false,
                updatedAt: new Date(),
            }),
    ],
    [
        "systemSetting.findUnique",
        () => systemSettings.findByKey("MAX_OVERBOOKING_PERCENT"),
    ],
    [
        "$transaction with a callback",
        () =>
            transactions.run((client) =>
                client.hotel.findUnique({ where: { id: ID } }),
            ),
    ],
];

describe("repository queries are valid Prisma queries (no database needed)", () => {
    it.each(QUERIES)(
        "%s passes Prisma validation and reaches the database layer",
        async (name, run) => {
            await expect(run()).rejects.toThrow(DATABASE_REACHED);
        },
    );

    it("detects an unknown field in a select (the check is not vacuous)", async () => {
        const query = prisma.hotel.findUnique({
            where: { id: ID },
            select: { notAColumn: true },
        });

        await expect(query).rejects.toMatchObject({
            name: "PrismaClientValidationError",
        });
    });

    it("detects an unknown field in the data of a write", async () => {
        const query = hotels.create({ ...NEW_HOTEL, notAColumn: "x" });

        await expect(query).rejects.toMatchObject({
            name: "PrismaClientValidationError",
        });
    });

    it("detects a status that is not in the HotelStatus enum", async () => {
        const query = hotels.listForReview({ status: "ARCHIVED" });

        await expect(query).rejects.toMatchObject({
            name: "PrismaClientValidationError",
        });
    });
});
