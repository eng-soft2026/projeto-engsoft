import { beforeEach, describe, expect, it } from "vitest";
import { ACCEPTANCE_TYPE_CODES } from "../../src/constants/acceptance-types.js";
import { AMENITY_TARGETS } from "../../src/constants/amenity.js";
import { HOTEL_POLICY_TYPES } from "../../src/constants/hotel-policy-types.js";
import { getPrisma } from "../../src/lib/prisma.js";
import { parseWithSchema } from "../../src/lib/validation.js";
import { replaceAcceptancesSchema } from "../../src/schemas/acceptance-schemas.js";
import { createAmenitySchema } from "../../src/schemas/amenity-schemas.js";
import {
    createPolicySchema,
    updatePolicySchema,
} from "../../src/schemas/policy-schemas.js";
import { acceptanceService } from "../../src/services/acceptance-service.js";
import { amenityAssociationService } from "../../src/services/amenity-association-service.js";
import { amenityService } from "../../src/services/amenity-service.js";
import { hotelManagerService } from "../../src/services/hotel-manager-service.js";
import { hotelService } from "../../src/services/hotel-service.js";
import { policyService } from "../../src/services/policy-service.js";
import { resetDatabase, seedBaseData } from "./helpers/database.js";
import {
    createHotelWithUnit,
    createManager,
    createRoom,
    createRoomType,
} from "./helpers/fixtures.js";
import { flushRedis } from "./helpers/redis.js";

async function createAmenity(manager, name) {
    return amenityService.createAmenity(
        manager,
        parseWithSchema(createAmenitySchema, { name }),
    );
}

function createGlobalAmenity(name, overrides = {}) {
    return getPrisma().amenity.create({
        data: { name, isGlobal: true, ...overrides },
    });
}

async function replaceAcceptances(manager, hotelId, acceptances) {
    return acceptanceService.replaceAcceptances(
        manager,
        hotelId,
        parseWithSchema(replaceAcceptancesSchema, { acceptances }),
    );
}

async function createPolicy(manager, hotelId, overrides = {}) {
    return policyService.createPolicy(
        manager,
        hotelId,
        parseWithSchema(createPolicySchema, {
            type: HOTEL_POLICY_TYPES.QUIET_HOURS,
            title: "Silêncio",
            description: "Silêncio das 22h às 7h.",
            ...overrides,
        }),
    );
}

async function createSupplyTree(owner) {
    const { hotel, unit } = await createHotelWithUnit(owner);
    const roomType = await createRoomType(owner, hotel.id);
    const room = await createRoom(owner, unit.id, roomType.id);
    return {
        hotel,
        targets: [
            [AMENITY_TARGETS.HOTEL, hotel.id],
            [AMENITY_TARGETS.UNIT, unit.id],
            [AMENITY_TARGETS.ROOM_TYPE, roomType.id],
            [AMENITY_TARGETS.ROOM, room.id],
        ],
    };
}

describe("amenities against MySQL", () => {
    let owner;

    beforeEach(async () => {
        await resetDatabase();
        await seedBaseData();
        await flushRedis();
        owner = await createManager();
    });

    it("rejects an amenity name repeated in another case", async () => {
        await createAmenity(owner, "Piscina");

        await expect(createAmenity(owner, "PISCINA")).rejects.toMatchObject({
            code: "AMENITY_ALREADY_EXISTS",
        });
        await expect(
            getPrisma().amenity.count({ where: { createdByUserId: owner.id } }),
        ).resolves.toBe(1);
    });

    it("rejects the name of a global amenity and allows another creator", async () => {
        await createGlobalAmenity("Wi-Fi");
        const other = await createManager();
        await createAmenity(owner, "Sauna");

        await expect(createAmenity(owner, "wi-fi")).rejects.toMatchObject({
            code: "AMENITY_ALREADY_EXISTS",
        });
        await expect(createAmenity(other, "Sauna")).resolves.toMatchObject({
            name: "Sauna",
            isGlobal: false,
        });
    });

    it("attaches amenities to the four targets and replaces the set", async () => {
        const { targets } = await createSupplyTree(owner);
        const wifi = await createGlobalAmenity("Wi-Fi");
        const sauna = await createAmenity(owner, "Sauna");

        for (const [target, id] of targets) {
            const attached = await amenityAssociationService.replaceAmenities(
                owner,
                target,
                id,
                { amenityIds: [wifi.id, sauna.id] },
            );
            expect(attached.map(({ name }) => name)).toEqual([
                "Sauna",
                "Wi-Fi",
            ]);

            const replaced = await amenityAssociationService.replaceAmenities(
                owner,
                target,
                id,
                { amenityIds: [wifi.id] },
            );
            expect(replaced.map(({ id: amenityId }) => amenityId)).toEqual([
                wifi.id,
            ]);
        }

        const prisma = getPrisma();
        await expect(prisma.hotelAmenity.count()).resolves.toBe(1);
        await expect(prisma.unitAmenity.count()).resolves.toBe(1);
        await expect(prisma.roomTypeAmenity.count()).resolves.toBe(1);
        await expect(prisma.roomAmenity.count()).resolves.toBe(1);
    });

    it("blocks a duplicated pair through the composite primary key", async () => {
        const { hotel } = await createSupplyTree(owner);
        const wifi = await createGlobalAmenity("Wi-Fi");
        await amenityAssociationService.replaceAmenities(
            owner,
            AMENITY_TARGETS.HOTEL,
            hotel.id,
            { amenityIds: [wifi.id] },
        );

        await expect(
            getPrisma().hotelAmenity.create({
                data: { hotelId: hotel.id, amenityId: wifi.id },
            }),
        ).rejects.toMatchObject({ code: "P2002" });
    });

    it("refuses an amenity of another manager and an inactive global one", async () => {
        const { hotel } = await createSupplyTree(owner);
        const stranger = await createManager();
        const foreign = await createAmenity(stranger, "Spa");
        const inactive = await createGlobalAmenity("Academia", {
            isActive: false,
        });

        for (const amenity of [foreign, inactive]) {
            await expect(
                amenityAssociationService.replaceAmenities(
                    owner,
                    AMENITY_TARGETS.HOTEL,
                    hotel.id,
                    { amenityIds: [amenity.id] },
                ),
            ).rejects.toMatchObject({ code: "AMENITY_NOT_FOUND" });
        }
        await expect(getPrisma().hotelAmenity.count()).resolves.toBe(0);
    });

    it("accepts an amenity created by an additional manager", async () => {
        const { hotel } = await createSupplyTree(owner);
        const coManager = await createManager();
        await hotelManagerService.addManager(owner, hotel.id, {
            email: coManager.email,
        });
        const spa = await createAmenity(coManager, "Spa");

        const attached = await amenityAssociationService.replaceAmenities(
            owner,
            AMENITY_TARGETS.HOTEL,
            hotel.id,
            { amenityIds: [spa.id] },
        );

        expect(attached.map(({ id }) => id)).toEqual([spa.id]);
    });
});

describe("acceptance rules and policies against MySQL", () => {
    let owner;
    let hotel;

    beforeEach(async () => {
        await resetDatabase();
        await seedBaseData();
        await flushRedis();
        owner = await createManager();
        ({ hotel } = await createHotelWithUnit(owner));
    });

    it("replaces the acceptance rules in one go", async () => {
        await replaceAcceptances(owner, hotel.id, [
            { type: ACCEPTANCE_TYPE_CODES.PETS, isAllowed: true },
            {
                type: ACCEPTANCE_TYPE_CODES.OTHER,
                customLabel: "Instrumentos musicais",
                isAllowed: false,
            },
        ]);

        const replaced = await replaceAcceptances(owner, hotel.id, [
            {
                type: ACCEPTANCE_TYPE_CODES.SMOKING,
                isAllowed: false,
                details: "Proibido em todas as áreas.",
            },
        ]);

        expect(replaced).toMatchObject([
            {
                type: ACCEPTANCE_TYPE_CODES.SMOKING,
                isAllowed: false,
                details: "Proibido em todas as áreas.",
            },
        ]);
        await expect(
            getPrisma().hotelAcceptance.count({ where: { hotelId: hotel.id } }),
        ).resolves.toBe(1);
    });

    it("rejects a repeated acceptance label ignoring case before touching MySQL", async () => {
        await replaceAcceptances(owner, hotel.id, [
            { type: ACCEPTANCE_TYPE_CODES.PETS, isAllowed: true },
        ]);

        await expect(
            replaceAcceptances(owner, hotel.id, [
                {
                    type: ACCEPTANCE_TYPE_CODES.OTHER,
                    customLabel: "Bicicletas",
                    isAllowed: true,
                },
                {
                    type: ACCEPTANCE_TYPE_CODES.OTHER,
                    customLabel: "BICICLETAS",
                    isAllowed: false,
                },
            ]),
        ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
        const stored = await acceptanceService.listAcceptances(owner, hotel.id);
        expect(stored.map(({ type }) => type)).toEqual([
            ACCEPTANCE_TYPE_CODES.PETS,
        ]);
    });

    it("blocks a duplicated acceptance label through the unique key", async () => {
        const [rule] = await replaceAcceptances(owner, hotel.id, [
            {
                type: ACCEPTANCE_TYPE_CODES.OTHER,
                customLabel: "Bicicletas",
                isAllowed: true,
            },
        ]);
        const stored = await getPrisma().hotelAcceptance.findUnique({
            where: { id: rule.id },
        });

        await expect(
            getPrisma().hotelAcceptance.create({
                data: {
                    hotelId: hotel.id,
                    acceptanceTypeId: stored.acceptanceTypeId,
                    customLabel: "Bicicletas",
                    isAllowed: false,
                },
            }),
        ).rejects.toMatchObject({ code: "P2002" });
    });

    it("creates a non-system policy and deactivates it without deleting", async () => {
        const policy = await createPolicy(owner, hotel.id);
        expect(policy).toMatchObject({ isSystem: false, isActive: true });

        const deactivated = await policyService.updatePolicy(
            owner,
            policy.id,
            parseWithSchema(updatePolicySchema, { isActive: false }),
        );

        expect(deactivated.isActive).toBe(false);
        const stored = await getPrisma().hotelPolicy.findUnique({
            where: { id: policy.id },
        });
        expect(stored).toMatchObject({ isActive: false, isSystem: false });
    });

    it("refuses every amenity, acceptance and policy write after submit-review", async () => {
        const roomType = await createRoomType(owner, hotel.id);
        const [unit] = await getPrisma().hotelUnit.findMany({
            where: { hotelId: hotel.id },
        });
        const room = await createRoom(owner, unit.id, roomType.id);
        const wifi = await createGlobalAmenity("Wi-Fi");
        const policy = await createPolicy(owner, hotel.id);
        await hotelService.submitForReview(owner, hotel.id);

        const targets = [
            [AMENITY_TARGETS.HOTEL, hotel.id],
            [AMENITY_TARGETS.UNIT, unit.id],
            [AMENITY_TARGETS.ROOM_TYPE, roomType.id],
            [AMENITY_TARGETS.ROOM, room.id],
        ];
        for (const [target, id] of targets) {
            await expect(
                amenityAssociationService.replaceAmenities(owner, target, id, {
                    amenityIds: [wifi.id],
                }),
            ).rejects.toMatchObject({ code: "INVALID_HOTEL_STATUS" });
        }
        await expect(
            replaceAcceptances(owner, hotel.id, [
                { type: ACCEPTANCE_TYPE_CODES.PETS, isAllowed: true },
            ]),
        ).rejects.toMatchObject({ code: "INVALID_HOTEL_STATUS" });
        await expect(createPolicy(owner, hotel.id)).rejects.toMatchObject({
            code: "INVALID_HOTEL_STATUS",
        });
        await expect(
            policyService.updatePolicy(owner, policy.id, { isActive: false }),
        ).rejects.toMatchObject({ code: "INVALID_HOTEL_STATUS" });

        const prisma = getPrisma();
        await expect(prisma.hotelAmenity.count()).resolves.toBe(0);
        await expect(prisma.hotelAcceptance.count()).resolves.toBe(0);
        await expect(prisma.hotelPolicy.count()).resolves.toBe(1);
    });
});
