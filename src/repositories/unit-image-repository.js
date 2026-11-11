import { getPrisma } from "../lib/prisma.js";
import { buildImageFields, createImageRepository } from "./image-repository.js";

const UNIT_IMAGE_TABLE = Object.freeze({
    model: "unitImage",
    ownerField: "unitId",
});

export const UNIT_IMAGE_FIELDS = buildImageFields(UNIT_IMAGE_TABLE);

export function createUnitImageRepository(getClient = getPrisma) {
    return createImageRepository(UNIT_IMAGE_TABLE, getClient);
}

export const unitImageRepository = createUnitImageRepository();
