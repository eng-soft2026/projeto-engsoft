import { DEFAULT_PAGE_SIZE } from "../constants/pagination.js";
import { ConflictError, ERROR_CODES } from "../lib/errors.js";
import { isUniqueConstraintViolation } from "../lib/prisma-errors.js";
import { buildPageMeta, getSkipTake } from "../lib/pagination.js";
import { amenityRepository as defaultAmenityRepository } from "../repositories/amenity-repository.js";

function createAmenityAlreadyExistsError() {
    return new ConflictError(
        ERROR_CODES.AMENITY_ALREADY_EXISTS,
        "Já existe uma comodidade com este nome.",
    );
}

export function createAmenityService({ amenityRepository }) {
    async function listAmenities(
        manager,
        { page = 1, pageSize = DEFAULT_PAGE_SIZE } = {},
    ) {
        const skipTake = getSkipTake({ page, pageSize });
        const [items, total] = await Promise.all([
            amenityRepository.listAvailableTo(manager.id, skipTake),
            amenityRepository.countAvailableTo(manager.id),
        ]);
        return {
            items,
            ...buildPageMeta({ page, pageSize, total }),
        };
    }

    async function createAmenity(manager, { name }) {
        const isTaken = await amenityRepository.existsVisibleByName(
            name,
            manager.id,
        );
        if (isTaken) {
            throw createAmenityAlreadyExistsError();
        }
        try {
            return await amenityRepository.create({
                createdByUserId: manager.id,
                name,
            });
        } catch (error) {
            if (isUniqueConstraintViolation(error)) {
                throw createAmenityAlreadyExistsError();
            }
            throw error;
        }
    }

    return Object.freeze({ listAmenities, createAmenity });
}

export const amenityService = createAmenityService({
    amenityRepository: defaultAmenityRepository,
});
