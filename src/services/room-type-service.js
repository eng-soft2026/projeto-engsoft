import { ConflictError, ERROR_CODES, NotFoundError } from "../lib/errors.js";
import { transactionRunner as defaultTransactionRunner } from "../lib/transaction.js";
import {
    canManageHotel,
    canViewHotel,
} from "../modules/hotels/hotel-access.js";
import {
    canEditHotel,
    canOperateHotel,
    createInvalidHotelStatusError,
} from "../modules/hotels/hotel-status-machine.js";
import { hotelRepository as defaultHotelRepository } from "../repositories/hotel-repository.js";
import { roomTypeRepository as defaultRoomTypeRepository } from "../repositories/room-type-repository.js";
import { formatDecimal } from "../utils/money.js";

export const ROOM_TYPE_DELETE_OUTCOMES = Object.freeze({
    DELETED: "DELETED",
    DEACTIVATED: "DEACTIVATED",
});

const PRICE_ONLY_CHANGE_KEYS = Object.freeze(["defaultPrice"]);

function createHotelNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.HOTEL_NOT_FOUND,
        "Hotel não encontrado.",
    );
}

function createRoomTypeNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.ROOM_TYPE_NOT_FOUND,
        "Tipo de acomodação não encontrado.",
    );
}

function createRoomTypeInactiveError() {
    return new ConflictError(
        ERROR_CODES.ROOM_TYPE_INACTIVE,
        "O tipo de acomodação está desativado.",
    );
}

export function presentRoomType(roomType) {
    const presented = {
        ...roomType,
        areaM2: formatDecimal(roomType.areaM2),
        defaultPrice: formatDecimal(roomType.defaultPrice),
    };
    delete presented.hotel;
    return presented;
}

function isPriceOnlyChange(changes) {
    return Object.entries(changes)
        .filter(([, value]) => value !== undefined)
        .every(([key]) => PRICE_ONLY_CHANGE_KEYS.includes(key));
}

function buildScalarChanges(changes) {
    const { name, description, maxGuests, areaM2, defaultPrice, isActive } =
        changes;
    const data = {
        name,
        description,
        maxGuests,
        areaM2,
        defaultPrice,
        isActive,
    };
    return Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined),
    );
}

export function createRoomTypeService({
    roomTypeRepository,
    hotelRepository,
    transactionRunner,
}) {
    async function findManagedHotelOrThrow(manager, hotelId) {
        const hotel = await hotelRepository.findById(hotelId);
        if (!hotel || !canManageHotel(manager, hotel)) {
            throw createHotelNotFoundError();
        }
        return hotel;
    }

    async function findManagedRoomTypeOrThrow(manager, roomTypeId, client) {
        const roomType = await roomTypeRepository.findByIdWithHotel(
            roomTypeId,
            client,
        );
        if (!roomType || !canManageHotel(manager, roomType.hotel)) {
            throw createRoomTypeNotFoundError();
        }
        return roomType;
    }

    function assertHotelStatusAllows(isAllowed, status) {
        if (!isAllowed(status)) {
            throw createInvalidHotelStatusError();
        }
    }

    async function createRoomType(manager, hotelId, input) {
        const hotel = await findManagedHotelOrThrow(manager, hotelId);
        assertHotelStatusAllows(canEditHotel, hotel.status);

        const roomType = await transactionRunner.run(async (client) => {
            const current = await hotelRepository.findById(hotelId, client);
            assertHotelStatusAllows(canEditHotel, current?.status);
            return roomTypeRepository.create({ hotelId, ...input }, client);
        });
        return presentRoomType(roomType);
    }

    async function listRoomTypes(user, hotelId) {
        const hotel = await hotelRepository.findById(hotelId);
        if (!hotel || !canViewHotel(user, hotel)) {
            throw createHotelNotFoundError();
        }
        const roomTypes = await roomTypeRepository.listByHotel(hotelId);
        return roomTypes.map(presentRoomType);
    }

    async function getRoomType(user, roomTypeId) {
        const roomType = await roomTypeRepository.findByIdWithHotel(roomTypeId);
        if (!roomType || !canViewHotel(user, roomType.hotel)) {
            throw createRoomTypeNotFoundError();
        }
        return presentRoomType(roomType);
    }

    async function updateRoomType(manager, roomTypeId, changes) {
        const roomType = await findManagedRoomTypeOrThrow(manager, roomTypeId);
        if (!roomType.isActive) {
            throw createRoomTypeInactiveError();
        }
        const isAllowed = isPriceOnlyChange(changes)
            ? canOperateHotel
            : canEditHotel;
        assertHotelStatusAllows(isAllowed, roomType.hotel.status);

        await transactionRunner.run(async (client) => {
            const current = await findManagedRoomTypeOrThrow(
                manager,
                roomTypeId,
                client,
            );
            assertHotelStatusAllows(isAllowed, current.hotel.status);
            if (!current.isActive) {
                throw createRoomTypeInactiveError();
            }
            await roomTypeRepository.updateFields(
                roomTypeId,
                { ...buildScalarChanges(changes), updatedAt: new Date() },
                client,
            );
            if (changes.beds !== undefined) {
                await roomTypeRepository.replaceBeds(
                    roomTypeId,
                    changes.beds,
                    client,
                );
            }
        });
        return getRoomType(manager, roomTypeId);
    }

    async function deleteRoomType(manager, roomTypeId) {
        const roomType = await findManagedRoomTypeOrThrow(manager, roomTypeId);
        assertHotelStatusAllows(canEditHotel, roomType.hotel.status);

        return transactionRunner.run(async (client) => {
            const current = await findManagedRoomTypeOrThrow(
                manager,
                roomTypeId,
                client,
            );
            assertHotelStatusAllows(canEditHotel, current.hotel.status);
            const isReferenced = await roomTypeRepository.hasRoomReferences(
                roomTypeId,
                client,
            );
            if (!isReferenced) {
                await roomTypeRepository.deleteById(roomTypeId, client);
                return {
                    id: roomTypeId,
                    outcome: ROOM_TYPE_DELETE_OUTCOMES.DELETED,
                };
            }
            if (current.isActive) {
                await roomTypeRepository.updateFields(
                    roomTypeId,
                    { isActive: false, updatedAt: new Date() },
                    client,
                );
            }
            return {
                id: roomTypeId,
                outcome: ROOM_TYPE_DELETE_OUTCOMES.DEACTIVATED,
            };
        });
    }

    return Object.freeze({
        createRoomType,
        listRoomTypes,
        getRoomType,
        updateRoomType,
        deleteRoomType,
    });
}

export const roomTypeService = createRoomTypeService({
    roomTypeRepository: defaultRoomTypeRepository,
    hotelRepository: defaultHotelRepository,
    transactionRunner: defaultTransactionRunner,
});
