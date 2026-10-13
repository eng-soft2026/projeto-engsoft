import { AMENITY_TARGETS } from "../constants/amenity.js";
import { ERROR_CODES, NotFoundError } from "../lib/errors.js";
import { transactionRunner as defaultTransactionRunner } from "../lib/transaction.js";
import {
    canManageHotel,
    canViewHotel,
} from "../modules/hotels/hotel-access.js";
import {
    canEditHotel,
    createInvalidHotelStatusError,
} from "../modules/hotels/hotel-status-machine.js";
import { amenityRepository as defaultAmenityRepository } from "../repositories/amenity-repository.js";
import { hotelRepository as defaultHotelRepository } from "../repositories/hotel-repository.js";
import { roomRepository as defaultRoomRepository } from "../repositories/room-repository.js";
import { roomTypeRepository as defaultRoomTypeRepository } from "../repositories/room-type-repository.js";
import { unitRepository as defaultUnitRepository } from "../repositories/unit-repository.js";

const NOT_FOUND_BY_TARGET = Object.freeze({
    [AMENITY_TARGETS.HOTEL]: [
        ERROR_CODES.HOTEL_NOT_FOUND,
        "Hotel não encontrado.",
    ],
    [AMENITY_TARGETS.UNIT]: [
        ERROR_CODES.UNIT_NOT_FOUND,
        "Unidade não encontrada.",
    ],
    [AMENITY_TARGETS.ROOM_TYPE]: [
        ERROR_CODES.ROOM_TYPE_NOT_FOUND,
        "Tipo de acomodação não encontrado.",
    ],
    [AMENITY_TARGETS.ROOM]: [
        ERROR_CODES.ROOM_NOT_FOUND,
        "Quarto não encontrado.",
    ],
});

function createTargetNotFoundError(target) {
    const [code, message] = NOT_FOUND_BY_TARGET[target];
    return new NotFoundError(code, message);
}

function createAmenityNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.AMENITY_NOT_FOUND,
        "Comodidade não encontrada.",
    );
}

function listHotelManagerIds(hotel) {
    return [hotel.ownerUserId, ...hotel.managers.map(({ userId }) => userId)];
}

export function createAmenityAssociationService({
    amenityRepository,
    hotelRepository,
    unitRepository,
    roomTypeRepository,
    roomRepository,
    transactionRunner,
}) {
    const hotelLoaders = {
        [AMENITY_TARGETS.HOTEL]: (id, client) =>
            hotelRepository.findById(id, client),
        [AMENITY_TARGETS.UNIT]: async (id, client) =>
            (await unitRepository.findByIdWithHotel(id, client))?.hotel,
        [AMENITY_TARGETS.ROOM_TYPE]: async (id, client) =>
            (await roomTypeRepository.findByIdWithHotel(id, client))?.hotel,
        [AMENITY_TARGETS.ROOM]: async (id, client) =>
            (await roomRepository.findByIdWithAccess(id, client))?.unit.hotel,
    };

    async function findHotelOrThrow(target, id, canAccess, user, client) {
        const hotel = await hotelLoaders[target](id, client);
        if (!hotel || !canAccess(user, hotel)) {
            throw createTargetNotFoundError(target);
        }
        return hotel;
    }

    function assertHotelIsEditable(hotel) {
        if (!canEditHotel(hotel.status)) {
            throw createInvalidHotelStatusError();
        }
    }

    async function listAmenities(user, target, id) {
        await findHotelOrThrow(target, id, canViewHotel, user);
        return amenityRepository.listAssociated(target, id);
    }

    async function replaceAmenities(manager, target, id, { amenityIds }) {
        const hotel = await findHotelOrThrow(
            target,
            id,
            canManageHotel,
            manager,
        );
        assertHotelIsEditable(hotel);

        return transactionRunner.run(async (client) => {
            const current = await findHotelOrThrow(
                target,
                id,
                canManageHotel,
                manager,
                client,
            );
            assertHotelIsEditable(current);

            const availableIds = await amenityRepository.findIdsAvailableTo(
                amenityIds,
                listHotelManagerIds(current),
                client,
            );
            if (availableIds.length !== amenityIds.length) {
                throw createAmenityNotFoundError();
            }
            await amenityRepository.replaceAssociations(
                target,
                id,
                amenityIds,
                client,
            );
            return amenityRepository.listAssociated(target, id, client);
        });
    }

    return Object.freeze({ listAmenities, replaceAmenities });
}

export const amenityAssociationService = createAmenityAssociationService({
    amenityRepository: defaultAmenityRepository,
    hotelRepository: defaultHotelRepository,
    unitRepository: defaultUnitRepository,
    roomTypeRepository: defaultRoomTypeRepository,
    roomRepository: defaultRoomRepository,
    transactionRunner: defaultTransactionRunner,
});
