import { USER_ROLES } from "../constants/user-roles.js";
import {
    ConflictError,
    ERROR_CODES,
    NotFoundError,
    ValidationError,
} from "../lib/errors.js";
import { isUniqueConstraintViolation } from "../lib/prisma-errors.js";
import { isHotelOwner } from "../modules/hotels/hotel-access.js";
import { hotelManagerRepository as defaultHotelManagerRepository } from "../repositories/hotel-manager-repository.js";
import { hotelRepository as defaultHotelRepository } from "../repositories/hotel-repository.js";
import { userRepository as defaultUserRepository } from "../repositories/user-repository.js";

function createHotelNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.HOTEL_NOT_FOUND,
        "Hotel não encontrado.",
    );
}

function createAlreadyManagerError() {
    return new ConflictError(
        ERROR_CODES.HOTEL_MANAGER_ALREADY_EXISTS,
        "Este usuário já é gestor do hotel.",
    );
}

function presentManager({ id, name, email }) {
    return { id, name, email };
}

export function createHotelManagerService({
    hotelRepository,
    hotelManagerRepository,
    userRepository,
}) {
    async function findOwnedHotelOrThrow(owner, hotelId) {
        const hotel = await hotelRepository.findById(hotelId);
        if (!hotel || !isHotelOwner(owner, hotel)) {
            throw createHotelNotFoundError();
        }
        return hotel;
    }

    async function findManagerCandidateOrThrow(email) {
        const user = await userRepository.findByEmail(email);
        if (!user) {
            throw new NotFoundError(
                ERROR_CODES.USER_NOT_FOUND,
                "Usuário não encontrado.",
            );
        }
        if (!user.isActive || user.role !== USER_ROLES.MANAGER) {
            throw new ValidationError(
                "O usuário precisa ter o papel de gestor.",
            );
        }
        return user;
    }

    async function persistManager(hotelId, userId) {
        try {
            await hotelManagerRepository.create(hotelId, userId);
        } catch (error) {
            if (isUniqueConstraintViolation(error)) {
                throw createAlreadyManagerError();
            }
            throw error;
        }
    }

    async function addManager(owner, hotelId, { email }) {
        const hotel = await findOwnedHotelOrThrow(owner, hotelId);
        const candidate = await findManagerCandidateOrThrow(email);

        const isAlreadyManager =
            candidate.id === hotel.ownerUserId ||
            (await hotelManagerRepository.exists(hotelId, candidate.id));
        if (isAlreadyManager) {
            throw createAlreadyManagerError();
        }

        await persistManager(hotelId, candidate.id);
        return presentManager(candidate);
    }

    async function removeManager(owner, hotelId, userId) {
        await findOwnedHotelOrThrow(owner, hotelId);

        const wasRemoved = await hotelManagerRepository.delete(hotelId, userId);
        if (!wasRemoved) {
            throw new NotFoundError(
                ERROR_CODES.HOTEL_MANAGER_NOT_FOUND,
                "Gestor adicional não encontrado neste hotel.",
            );
        }
    }

    return Object.freeze({ addManager, removeManager });
}

export const hotelManagerService = createHotelManagerService({
    hotelRepository: defaultHotelRepository,
    hotelManagerRepository: defaultHotelManagerRepository,
    userRepository: defaultUserRepository,
});
