import { BUSINESS_TIME_ZONE } from "../constants/time-zone.js";
import {
    ConflictError,
    ERROR_CODES,
    NotFoundError,
    ValidationError,
} from "../lib/errors.js";
import { transactionRunner as defaultTransactionRunner } from "../lib/transaction.js";
import {
    canManageHotel,
    canViewHotel,
} from "../modules/hotels/hotel-access.js";
import {
    canOperateHotel,
    createInvalidHotelStatusError,
} from "../modules/hotels/hotel-status-machine.js";
import { hotelRepository as defaultHotelRepository } from "../repositories/hotel-repository.js";
import { roomPricePeriodRepository as defaultRoomPricePeriodRepository } from "../repositories/room-price-period-repository.js";
import { roomRepository as defaultRoomRepository } from "../repositories/room-repository.js";
import {
    calendarDateToDate,
    dateToCalendarDate,
    getCalendarDateInTimeZone,
} from "../utils/calendar-date.js";
import { formatDecimal } from "../utils/money.js";

function createRoomNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.ROOM_NOT_FOUND,
        "Quarto não encontrado.",
    );
}

function createRoomInactiveError() {
    return new ConflictError(
        ERROR_CODES.ROOM_INACTIVE,
        "O quarto está desativado.",
    );
}

function createPricePeriodNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.PRICE_PERIOD_NOT_FOUND,
        "Período de preço não encontrado.",
    );
}

function createPricePeriodOverlapError() {
    return new ConflictError(
        ERROR_CODES.PRICE_PERIOD_OVERLAP,
        "Já existe um período de preço nessas datas para este quarto.",
    );
}

function createPricePeriodPastError() {
    return new ConflictError(
        ERROR_CODES.PRICE_PERIOD_PAST,
        "Períodos já iniciados não podem ser alterados nem excluídos.",
    );
}

export function presentRoomPricePeriod(period) {
    return {
        id: period.id,
        roomId: period.roomId,
        startDate: dateToCalendarDate(period.startDate),
        endDate: dateToCalendarDate(period.endDate),
        price: formatDecimal(period.price),
        createdAt: period.createdAt,
        updatedAt: period.updatedAt,
    };
}

export function createRoomPricePeriodService({
    roomRepository,
    roomPricePeriodRepository,
    hotelRepository,
    transactionRunner,
    clock = () => new Date(),
    timeZone = BUSINESS_TIME_ZONE,
}) {
    function getToday() {
        return getCalendarDateInTimeZone(clock(), timeZone);
    }

    function assertHotelOperable(hotel) {
        if (!canOperateHotel(hotel.status)) {
            throw createInvalidHotelStatusError();
        }
    }

    function assertStartsFromToday(startDate) {
        if (startDate < getToday()) {
            throw new ValidationError(
                "A data inicial não pode ser anterior a hoje.",
            );
        }
    }

    function assertNotStarted(period) {
        if (dateToCalendarDate(period.startDate) < getToday()) {
            throw createPricePeriodPastError();
        }
    }

    async function findManagedRoomOrThrow(manager, roomId, client) {
        const room = await roomRepository.findByIdWithAccess(roomId, client);
        if (!room || !canManageHotel(manager, room.unit.hotel)) {
            throw createRoomNotFoundError();
        }
        return room;
    }

    async function findManagedPeriodOrThrow(manager, periodId, client) {
        const period = await roomPricePeriodRepository.findByIdWithAccess(
            periodId,
            client,
        );
        if (!period || !canManageHotel(manager, period.room.unit.hotel)) {
            throw createPricePeriodNotFoundError();
        }
        return period;
    }

    async function loadWritablePeriod(manager, periodId, client) {
        const period = await findManagedPeriodOrThrow(
            manager,
            periodId,
            client,
        );
        assertHotelOperable(period.room.unit.hotel);
        assertNotStarted(period);
        return period;
    }

    async function assertNoOverlap(roomId, range, client) {
        const overlapping = await roomPricePeriodRepository.findOverlapping(
            roomId,
            {
                startDate: calendarDateToDate(range.startDate),
                endDate: calendarDateToDate(range.endDate),
                excludeId: range.excludeId,
            },
            client,
        );
        if (overlapping) {
            throw createPricePeriodOverlapError();
        }
    }

    async function listPricePeriods(user, roomId) {
        const room = await roomRepository.findByIdWithAccess(roomId);
        if (!room || !canViewHotel(user, room.unit.hotel)) {
            throw createRoomNotFoundError();
        }
        const periods = await roomPricePeriodRepository.listByRoom(roomId);
        return periods.map(presentRoomPricePeriod);
    }

    async function createPricePeriod(manager, roomId, input) {
        const room = await findManagedRoomOrThrow(manager, roomId);
        assertHotelOperable(room.unit.hotel);
        assertStartsFromToday(input.startDate);

        const created = await transactionRunner.run(async (client) => {
            await hotelRepository.lockForUpdate(room.unit.hotelId, client);
            const current = await findManagedRoomOrThrow(
                manager,
                roomId,
                client,
            );
            assertHotelOperable(current.unit.hotel);
            if (!current.isActive) {
                throw createRoomInactiveError();
            }
            await assertNoOverlap(roomId, input, client);
            return roomPricePeriodRepository.create(
                {
                    roomId,
                    startDate: calendarDateToDate(input.startDate),
                    endDate: calendarDateToDate(input.endDate),
                    price: input.price,
                },
                client,
            );
        });
        return presentRoomPricePeriod(created);
    }

    function buildNextRange(period, changes) {
        const range = {
            startDate:
                changes.startDate ?? dateToCalendarDate(period.startDate),
            endDate: changes.endDate ?? dateToCalendarDate(period.endDate),
            excludeId: period.id,
        };
        if (range.startDate > range.endDate) {
            throw new ValidationError(
                "A data final deve ser igual ou posterior à inicial.",
            );
        }
        return range;
    }

    function buildChangeData(changes) {
        const data = { updatedAt: clock() };
        if (changes.startDate !== undefined) {
            data.startDate = calendarDateToDate(changes.startDate);
        }
        if (changes.endDate !== undefined) {
            data.endDate = calendarDateToDate(changes.endDate);
        }
        if (changes.price !== undefined) {
            data.price = changes.price;
        }
        return data;
    }

    async function updatePricePeriod(manager, periodId, changes) {
        const period = await loadWritablePeriod(manager, periodId);
        buildNextRange(period, changes);
        if (changes.startDate !== undefined) {
            assertStartsFromToday(changes.startDate);
        }

        const updated = await transactionRunner.run(async (client) => {
            await hotelRepository.lockForUpdate(
                period.room.unit.hotelId,
                client,
            );
            const current = await loadWritablePeriod(manager, periodId, client);
            if (!current.room.isActive) {
                throw createRoomInactiveError();
            }
            const range = buildNextRange(current, changes);
            await assertNoOverlap(current.roomId, range, client);
            return roomPricePeriodRepository.updateFields(
                periodId,
                buildChangeData(changes),
                client,
            );
        });
        return presentRoomPricePeriod(updated);
    }

    async function deletePricePeriod(manager, periodId) {
        const period = await loadWritablePeriod(manager, periodId);

        await transactionRunner.run(async (client) => {
            await hotelRepository.lockForUpdate(
                period.room.unit.hotelId,
                client,
            );
            await loadWritablePeriod(manager, periodId, client);
            await roomPricePeriodRepository.deleteById(periodId, client);
        });
        return { id: periodId };
    }

    return Object.freeze({
        listPricePeriods,
        createPricePeriod,
        updatePricePeriod,
        deletePricePeriod,
    });
}

export const roomPricePeriodService = createRoomPricePeriodService({
    roomRepository: defaultRoomRepository,
    roomPricePeriodRepository: defaultRoomPricePeriodRepository,
    hotelRepository: defaultHotelRepository,
    transactionRunner: defaultTransactionRunner,
});
