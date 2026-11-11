import { MEDIA_SCOPES } from "../constants/media.js";
import { getPrisma } from "../lib/prisma.js";

const IMAGE_MODELS_BY_SCOPE = Object.freeze({
    [MEDIA_SCOPES.HOTEL]: "hotelImage",
    [MEDIA_SCOPES.UNIT]: "unitImage",
    [MEDIA_SCOPES.ROOM_TYPE]: "roomTypeImage",
});

export function createMediaReferenceRepository(getClient = getPrisma) {
    return Object.freeze({
        async isPublicIdReferenced(scope, publicId, client = getClient()) {
            const model = IMAGE_MODELS_BY_SCOPE[scope];
            const image = await client[model].findUnique({
                where: { cloudinaryPublicId: publicId },
                select: { id: true },
            });
            return image !== null;
        },
    });
}

export const mediaReferenceRepository = createMediaReferenceRepository();
