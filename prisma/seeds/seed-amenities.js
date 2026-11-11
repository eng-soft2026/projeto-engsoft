import { GLOBAL_AMENITY_NAMES } from "../../src/constants/global-amenities.js";

function normalizeName(name) {
    return name.toLocaleLowerCase("pt-BR");
}

async function findExistingGlobalNames(prisma) {
    const amenities = await prisma.amenity.findMany({
        where: {
            isGlobal: true,
            createdByUserId: null,
            name: { in: [...GLOBAL_AMENITY_NAMES] },
        },
        select: { name: true },
    });
    return new Set(amenities.map(({ name }) => normalizeName(name)));
}

export async function buildGlobalAmenityOperations(prisma) {
    const existingNames = await findExistingGlobalNames(prisma);
    return GLOBAL_AMENITY_NAMES.filter(
        (name) => !existingNames.has(normalizeName(name)),
    ).map((name) =>
        prisma.amenity.create({
            data: { name, isGlobal: true, createdByUserId: null },
        }),
    );
}
