import { getPrisma } from "../lib/prisma.js";

const BASE_IMAGE_FIELDS = Object.freeze({
    id: true,
    cloudinaryPublicId: true,
    url: true,
    position: true,
    format: true,
    bytes: true,
    width: true,
    height: true,
    createdAt: true,
    updatedAt: true,
});

export function buildImageFields({ ownerField, hasCover = true }) {
    return Object.freeze({
        ...BASE_IMAGE_FIELDS,
        [ownerField]: true,
        ...(hasCover && { isCover: true }),
    });
}

export function createImageRepository(
    { model, ownerField, hasCover = true },
    getClient = getPrisma,
) {
    const fields = buildImageFields({ ownerField, hasCover });

    return Object.freeze({
        listByOwner(ownerId, client = getClient()) {
            return client[model].findMany({
                where: { [ownerField]: ownerId },
                select: fields,
                orderBy: [{ position: "asc" }, { createdAt: "asc" }],
            });
        },

        findById(id, client = getClient()) {
            return client[model].findUnique({
                where: { id },
                select: fields,
            });
        },

        create(data, client = getClient()) {
            return client[model].create({ data, select: fields });
        },

        updateFields(id, data, client = getClient()) {
            return client[model].update({
                where: { id },
                data,
                select: { id: true },
            });
        },

        clearCover(ownerId, client = getClient()) {
            return client[model].updateMany({
                where: { [ownerField]: ownerId, isCover: true },
                data: { isCover: false },
            });
        },

        delete(id, client = getClient()) {
            return client[model].delete({
                where: { id },
                select: { id: true },
            });
        },
    });
}
