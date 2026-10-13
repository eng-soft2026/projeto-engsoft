import { AMENITY_TARGETS } from "../constants/amenity.js";
import { getPrisma } from "../lib/prisma.js";

export const AMENITY_FIELDS = Object.freeze({
    id: true,
    name: true,
    isGlobal: true,
    isActive: true,
    createdAt: true,
});

const ASSOCIATIONS = Object.freeze({
    [AMENITY_TARGETS.HOTEL]: { model: "hotelAmenity", ownerKey: "hotelId" },
    [AMENITY_TARGETS.UNIT]: { model: "unitAmenity", ownerKey: "unitId" },
    [AMENITY_TARGETS.ROOM_TYPE]: {
        model: "roomTypeAmenity",
        ownerKey: "roomTypeId",
    },
    [AMENITY_TARGETS.ROOM]: { model: "roomAmenity", ownerKey: "roomId" },
});

function buildAvailabilityFilter(creatorIds) {
    return {
        isActive: true,
        OR: [{ isGlobal: true }, { createdByUserId: { in: creatorIds } }],
    };
}

export function createAmenityRepository(getClient = getPrisma) {
    return Object.freeze({
        create({ createdByUserId, name }, client = getClient()) {
            return client.amenity.create({
                data: { createdByUserId, name, isGlobal: false },
                select: AMENITY_FIELDS,
            });
        },

        listAvailableTo(userId, client = getClient()) {
            return client.amenity.findMany({
                where: buildAvailabilityFilter([userId]),
                select: AMENITY_FIELDS,
                orderBy: { name: "asc" },
            });
        },

        async findIdsAvailableTo(amenityIds, creatorIds, client = getClient()) {
            const amenities = await client.amenity.findMany({
                where: {
                    id: { in: amenityIds },
                    ...buildAvailabilityFilter(creatorIds),
                },
                select: { id: true },
            });
            return amenities.map(({ id }) => id);
        },

        async existsVisibleByName(name, userId, client = getClient()) {
            const amenity = await client.amenity.findFirst({
                where: {
                    name,
                    OR: [{ isGlobal: true }, { createdByUserId: userId }],
                },
                select: { id: true },
            });
            return amenity !== null;
        },

        async listAssociated(target, ownerId, client = getClient()) {
            const { model, ownerKey } = ASSOCIATIONS[target];
            const rows = await client[model].findMany({
                where: { [ownerKey]: ownerId },
                select: { amenity: { select: AMENITY_FIELDS } },
                orderBy: { amenity: { name: "asc" } },
            });
            return rows.map(({ amenity }) => amenity);
        },

        async replaceAssociations(
            target,
            ownerId,
            amenityIds,
            client = getClient(),
        ) {
            const { model, ownerKey } = ASSOCIATIONS[target];
            await client[model].deleteMany({ where: { [ownerKey]: ownerId } });
            await client[model].createMany({
                data: amenityIds.map((amenityId) => ({
                    [ownerKey]: ownerId,
                    amenityId,
                })),
            });
        },
    });
}

export const amenityRepository = createAmenityRepository();
