import { ROOM_STATUSES } from "../constants/room-statuses.js";
import {
    ConflictError,
    ERROR_CODES,
    NotFoundError,
    ValidationError,
} from "../lib/errors.js";
import { isUniqueConstraintViolation } from "../lib/prisma-errors.js";
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
import { roomRepository as defaultRoomRepository } from "../repositories/room-repository.js";
import { roomTypeRepository as defaultRoomTypeRepository } from "../repositories/room-type-repository.js";
import { unitRepository as defaultUnitRepository } from "../repositories/unit-repository.js";
import { formatDecimal, toDecimalString } from "../utils/money.js";

export const ROOM_DELETE_OUTCOMES = Object.freeze({
    DELETED: "DELETED",
    DEACTIVATED: "DEACTIVATED",
});

const STRUCTURAL_CHANGE_KEYS = Object.freeze([
    "roomTypeId",
    "number",
    "floor",
    "isAccessible",
]);

function createUnitNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.UNIT_NOT_FOUND,
        "Unidade não encontrada.",
    );
}

function createRoomNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.ROOM_NOT_FOUND,
        "Quarto não encontrado.",
    );
}

function createRoomTypeNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.ROOM_TYPE_NOT_FOUND,
        "Tipo de acomodação não encontrado.",
    );
}

function createRoomInactiveError() {
    return new ConflictError(
        ERROR_CODES.ROOM_INACTIVE,
        "O quarto está desativado.",
    );
}

function createRoomNumberAlreadyExistsError() {
    return new ConflictError(
        ERROR_CODES.ROOM_NUMBER_ALREADY_EXISTS,
        "Já existe um quarto com esse número na unidade.",
    );
}

export function presentRoom(room) {
    const [openPrice] = room.priceHistory ?? [];
    const price = formatDecimal(openPrice?.price);
    const presented = {
        ...room,
        price,
        effectivePrice: price ?? formatDecimal(room.roomType.defaultPrice),
        roomType: {
            ...room.roomType,
            defaultPrice: formatDecimal(room.roomType.defaultPrice),
        },
    };
    delete presented.priceHistory;
    delete presented.unit;
    return presented;
}

function hasStructuralChange(changes) {
    return STRUCTURAL_CHANGE_KEYS.some((key) => changes[key] !== undefined);
}

function buildScalarChanges(changes) {
    const { number, floor, isAccessible, administrativeNotes, status } =
        changes;
    const data = { number, floor, isAccessible, administrativeNotes, status };
    if (changes.isActive === false) {
        data.isActive = false;
        data.status = ROOM_STATUSES.INACTIVE;
    }
    if (changes.roomTypeId !== undefined) {
        data.roomTypeId = changes.roomTypeId;
    }
    return Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined),
    );
}

async function runTranslatingNumberConflict(work) {
    try {
        return await work();
    } catch (error) {
        if (isUniqueConstraintViolation(error)) {
            throw createRoomNumberAlreadyExistsError();
        }
        throw error;
    }
}

export function createRoomService({
    roomRepository,
    roomTypeRepository,
    unitRepository,
    transactionRunner,
    clock = () => new Date(),
}) {
    function assertHotelStatusAllows(isAllowed, status) {
        if (!isAllowed(status)) {
            throw createInvalidHotelStatusError();
        }
    }

    async function assertRoomTypeUsable(roomTypeId, hotelId, client) {
        const roomType = await roomTypeRepository.findById(roomTypeId, client);
        if (!roomType || roomType.hotelId !== hotelId || !roomType.isActive) {
            throw createRoomTypeNotFoundError();
        }
    }

    async function findManagedRoomOrThrow(manager, roomId, client) {
        const room = await roomRepository.findByIdWithAccess(roomId, client);
        if (!room || !canManageHotel(manager, room.unit.hotel)) {
            throw createRoomNotFoundError();
        }
        return room;
    }

    async function loadManagedUnitOrThrow(manager, unitId, client) {
        const unit = await unitRepository.findByIdWithHotel(unitId, client);
        if (!unit || !canManageHotel(manager, unit.hotel)) {
            throw createUnitNotFoundError();
        }
        return unit;
    }

    function assertUnitActive(unit) {
        if (!unit.isActive) {
            throw new ValidationError("A unidade está desativada.");
        }
    }

    async function createRoom(manager, unitId, input) {
        const unit = await loadManagedUnitOrThrow(manager, unitId);
        assertHotelStatusAllows(canEditHotel, unit.hotel.status);
        assertUnitActive(unit);

        const room = await runTranslatingNumberConflict(() =>
            transactionRunner.run(async (client) => {
                const current = await loadManagedUnitOrThrow(
                    manager,
                    unitId,
                    client,
                );
                assertHotelStatusAllows(canEditHotel, current.hotel.status);
                assertUnitActive(current);
                await assertRoomTypeUsable(
                    input.roomTypeId,
                    current.hotelId,
                    client,
                );
                const { price, ...fields } = input;
                return roomRepository.create(
                    {
                        unitId,
                        ...fields,
                        price,
                        validFrom: clock(),
                    },
                    client,
                );
            }),
        );
        return presentRoom(room);
    }

    async function listRooms(user, unitId) {
        const unit = await unitRepository.findByIdWithHotel(unitId);
        if (!unit || !canViewHotel(user, unit.hotel)) {
            throw createUnitNotFoundError();
        }
        const rooms = await roomRepository.listByUnit(unitId);
        return rooms.map(presentRoom);
    }

    async function getRoom(user, roomId) {
        const room = await roomRepository.findByIdWithAccess(roomId);
        if (!room || !canViewHotel(user, room.unit.hotel)) {
            throw createRoomNotFoundError();
        }
        return presentRoom(room);
    }

    async function applyRoomChanges(room, changes, client) {
        const now = clock();
        await roomRepository.updateFields(
            room.id,
            { ...buildScalarChanges(changes), updatedAt: now },
            client,
        );
        if (
            changes.roomTypeId !== undefined &&
            changes.roomTypeId !== room.roomTypeId
        ) {
            await roomRepository.changeRoomType(
                room.id,
                changes.roomTypeId,
                now,
                client,
            );
        }
        if (changes.price !== undefined) {
            await applyPriceChange(room, changes.price, now, client);
        }
    }

    async function applyPriceChange(room, price, now, client) {
        const [openPrice] = room.priceHistory;
        const currentPrice = openPrice
            ? toDecimalString(openPrice.price)
            : null;
        if (price === currentPrice) {
            return;
        }
        await roomRepository.changePrice(room.id, price, now, client);
    }

    async function updateRoom(manager, roomId, changes) {
        const room = await findManagedRoomOrThrow(manager, roomId);
        const isAllowed = hasStructuralChange(changes)
            ? canEditHotel
            : canOperateHotel;
        assertHotelStatusAllows(isAllowed, room.unit.hotel.status);

        await runTranslatingNumberConflict(() =>
            transactionRunner.run(async (client) => {
                const current = await findManagedRoomOrThrow(
                    manager,
                    roomId,
                    client,
                );
                assertHotelStatusAllows(isAllowed, current.unit.hotel.status);
                if (!current.isActive) {
                    throw createRoomInactiveError();
                }
                if (changes.roomTypeId !== undefined) {
                    await assertRoomTypeUsable(
                        changes.roomTypeId,
                        current.unit.hotelId,
                        client,
                    );
                }
                await applyRoomChanges(current, changes, client);
            }),
        );
        return getRoom(manager, roomId);
    }

    async function deleteRoom(manager, roomId) {
        const room = await findManagedRoomOrThrow(manager, roomId);
        assertHotelStatusAllows(canOperateHotel, room.unit.hotel.status);

        return transactionRunner.run(async (client) => {
            const current = await findManagedRoomOrThrow(
                manager,
                roomId,
                client,
            );
            assertHotelStatusAllows(canOperateHotel, current.unit.hotel.status);
            const hasHistory = await roomRepository.hasHistory(roomId, client);
            if (!hasHistory) {
                await roomRepository.deleteById(roomId, client);
                return { id: roomId, outcome: ROOM_DELETE_OUTCOMES.DELETED };
            }
            if (current.isActive) {
                await roomRepository.updateFields(
                    roomId,
                    {
                        isActive: false,
                        status: ROOM_STATUSES.INACTIVE,
                        updatedAt: clock(),
                    },
                    client,
                );
            }
            return { id: roomId, outcome: ROOM_DELETE_OUTCOMES.DEACTIVATED };
        });
    }

    return Object.freeze({
        createRoom,
        listRooms,
        getRoom,
        updateRoom,
        deleteRoom,
    });
}

export const roomService = createRoomService({
    roomRepository: defaultRoomRepository,
    roomTypeRepository: defaultRoomTypeRepository,
    unitRepository: defaultUnitRepository,
    transactionRunner: defaultTransactionRunner,
});
