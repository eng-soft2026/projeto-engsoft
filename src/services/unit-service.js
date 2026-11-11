import { SYSTEM_SETTING_KEYS } from "../constants/system-settings.js";
import { PLATFORM_MAX_OVERBOOKING_PERCENT } from "../constants/unit.js";
import { DEFAULT_PAGE_SIZE } from "../constants/pagination.js";
import { ERROR_CODES, NotFoundError, ValidationError } from "../lib/errors.js";
import { logger as defaultLogger, serializeError } from "../lib/logger.js";
import { buildPageMeta, getSkipTake } from "../lib/pagination.js";
import { transactionRunner as defaultTransactionRunner } from "../lib/transaction.js";
import {
    canManageHotel,
    canViewHotel,
} from "../modules/hotels/hotel-access.js";
import {
    canEditHotel,
    createInvalidHotelStatusError,
} from "../modules/hotels/hotel-status-machine.js";
import { geocodingService as defaultGeocodingService } from "../modules/maps/geocoding-service.js";
import { hotelRepository as defaultHotelRepository } from "../repositories/hotel-repository.js";
import { systemSettingRepository as defaultSystemSettingRepository } from "../repositories/system-setting-repository.js";
import { unitRepository as defaultUnitRepository } from "../repositories/unit-repository.js";
import { dateToTimeOfDay, timeOfDayToDate } from "../utils/time-of-day.js";

function createHotelNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.HOTEL_NOT_FOUND,
        "Hotel não encontrado.",
    );
}

function createUnitNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.UNIT_NOT_FOUND,
        "Unidade não encontrada.",
    );
}

const ADDRESS_LOCATION_FIELDS = Object.freeze([
    "zipCode",
    "street",
    "number",
    "neighborhood",
    "city",
    "state",
]);

const ADDRESS_CHANGES = Object.freeze({
    NONE: "NONE",
    COMPLEMENT: "COMPLEMENT",
    LOCATION: "LOCATION",
});

function resolveAddressChange(storedAddress, nextAddress) {
    if (nextAddress === undefined) {
        return ADDRESS_CHANGES.NONE;
    }
    const hasLocationChanged = ADDRESS_LOCATION_FIELDS.some(
        (field) => storedAddress?.[field] !== nextAddress[field],
    );
    if (hasLocationChanged) {
        return ADDRESS_CHANGES.LOCATION;
    }
    const storedComplement = storedAddress?.complement ?? null;
    if (storedComplement !== (nextAddress.complement ?? null)) {
        return ADDRESS_CHANGES.COMPLEMENT;
    }
    return ADDRESS_CHANGES.NONE;
}

function withCoordinates(unit, coordinates) {
    if (!coordinates) {
        return unit;
    }
    return { ...unit, address: { ...unit.address, ...coordinates } };
}

function presentUnit(unit) {
    const presented = {
        ...unit,
        checkInTime: dateToTimeOfDay(unit.checkInTime),
        checkOutTime: dateToTimeOfDay(unit.checkOutTime),
    };
    delete presented.hotel;
    return presented;
}

function buildScalarChanges(changes) {
    const { name, email, overbookingPercentage, isActive } = changes;
    const data = { name, email, overbookingPercentage, isActive };
    if (changes.checkInTime !== undefined) {
        data.checkInTime = timeOfDayToDate(changes.checkInTime);
    }
    if (changes.checkOutTime !== undefined) {
        data.checkOutTime = timeOfDayToDate(changes.checkOutTime);
    }
    return Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined),
    );
}

export function createUnitService({
    unitRepository,
    hotelRepository,
    systemSettingRepository,
    transactionRunner,
    geocodingService,
    logger,
}) {
    async function resolveMaxOverbookingPercent() {
        const setting = await systemSettingRepository.findByKey(
            SYSTEM_SETTING_KEYS.MAX_OVERBOOKING_PERCENT,
        );
        const configured = Number.parseInt(setting?.value, 10);
        if (Number.isNaN(configured)) {
            return PLATFORM_MAX_OVERBOOKING_PERCENT;
        }
        return Math.min(configured, PLATFORM_MAX_OVERBOOKING_PERCENT);
    }

    async function assertOverbookingWithinLimit(percentage) {
        if (percentage === undefined) {
            return;
        }
        const maxPercent = await resolveMaxOverbookingPercent();
        if (percentage > maxPercent) {
            throw new ValidationError(
                `O overbooking deve ser no máximo ${maxPercent}%.`,
                ERROR_CODES.VALIDATION_ERROR,
            );
        }
    }

    async function assertHotelEditable(hotelId, client) {
        const hotel = await hotelRepository.findById(hotelId, client);
        if (!hotel) {
            throw createHotelNotFoundError();
        }
        if (!canEditHotel(hotel.status)) {
            throw createInvalidHotelStatusError();
        }
    }

    async function findManagedHotelOrThrow(manager, hotelId) {
        const hotel = await hotelRepository.findById(hotelId);
        if (!hotel || !canManageHotel(manager, hotel)) {
            throw createHotelNotFoundError();
        }
        return hotel;
    }

    async function geocodeUnitAddress(unitId, address) {
        try {
            const coordinates = await geocodingService.geocodeAddress(address);
            const isStored =
                await unitRepository.updateCoordinatesIfAddressMatches(
                    unitId,
                    address,
                    coordinates,
                );
            return isStored ? coordinates : null;
        } catch (error) {
            logger.warn("Unit address geocoding failed", {
                unitId,
                error: serializeError(error),
            });
            return null;
        }
    }

    async function findEditableUnitOrThrow(manager, unitId) {
        const unit = await unitRepository.findByIdWithHotel(unitId);
        if (!unit || !canManageHotel(manager, unit.hotel)) {
            throw createUnitNotFoundError();
        }
        if (!canEditHotel(unit.hotel.status)) {
            throw createInvalidHotelStatusError();
        }
        return unit;
    }

    async function createUnit(manager, hotelId, input) {
        const hotel = await findManagedHotelOrThrow(manager, hotelId);
        if (!canEditHotel(hotel.status)) {
            throw createInvalidHotelStatusError();
        }
        await assertOverbookingWithinLimit(input.overbookingPercentage);

        const unit = await transactionRunner.run(async (client) => {
            await assertHotelEditable(hotelId, client);
            return unitRepository.create(
                {
                    hotelId,
                    name: input.name,
                    email: input.email,
                    checkInTime: timeOfDayToDate(input.checkInTime),
                    checkOutTime: timeOfDayToDate(input.checkOutTime),
                    overbookingPercentage: input.overbookingPercentage,
                    address: input.address,
                    phones: input.phones,
                },
                client,
            );
        });
        const coordinates = await geocodeUnitAddress(unit.id, input.address);
        return presentUnit(withCoordinates(unit, coordinates));
    }

    async function listUnits(
        user,
        hotelId,
        { page = 1, pageSize = DEFAULT_PAGE_SIZE } = {},
    ) {
        const hotel = await hotelRepository.findById(hotelId);
        if (!hotel || !canViewHotel(user, hotel)) {
            throw createHotelNotFoundError();
        }
        const skipTake = getSkipTake({ page, pageSize });
        const [units, total] = await Promise.all([
            unitRepository.listByHotel(hotelId, skipTake),
            unitRepository.countByHotel(hotelId),
        ]);
        return {
            items: units.map(presentUnit),
            ...buildPageMeta({ page, pageSize, total }),
        };
    }

    async function getUnit(user, unitId) {
        const unit = await unitRepository.findByIdWithHotel(unitId);
        if (!unit || !canViewHotel(user, unit.hotel)) {
            throw createUnitNotFoundError();
        }
        return presentUnit(unit);
    }

    async function updateUnit(manager, unitId, changes) {
        const unit = await findEditableUnitOrThrow(manager, unitId);
        const addressChange = resolveAddressChange(
            unit.address,
            changes.address,
        );
        await assertOverbookingWithinLimit(changes.overbookingPercentage);

        await transactionRunner.run(async (client) => {
            await assertHotelEditable(unit.hotelId, client);
            await unitRepository.updateFields(
                unitId,
                { ...buildScalarChanges(changes), updatedAt: new Date() },
                client,
            );
            if (addressChange === ADDRESS_CHANGES.LOCATION) {
                await unitRepository.replaceAddress(
                    unitId,
                    changes.address,
                    client,
                );
            }
            if (addressChange === ADDRESS_CHANGES.COMPLEMENT) {
                await unitRepository.updateAddressFields(
                    unitId,
                    { complement: changes.address.complement ?? null },
                    client,
                );
            }
            if (changes.phones !== undefined) {
                await unitRepository.replacePhones(
                    unitId,
                    changes.phones,
                    client,
                );
            }
        });
        if (addressChange === ADDRESS_CHANGES.LOCATION) {
            await geocodeUnitAddress(unitId, changes.address);
        }
        return presentUnit(await unitRepository.findByIdWithHotel(unitId));
    }

    async function updateUnitLocation(manager, unitId, coordinates) {
        const unit = await findEditableUnitOrThrow(manager, unitId);
        await transactionRunner.run(async (client) => {
            await assertHotelEditable(unit.hotelId, client);
            await unitRepository.updateAddressFields(
                unitId,
                {
                    latitude: coordinates.latitude,
                    longitude: coordinates.longitude,
                },
                client,
            );
        });
        return presentUnit(await unitRepository.findByIdWithHotel(unitId));
    }

    return Object.freeze({
        createUnit,
        listUnits,
        getUnit,
        updateUnit,
        updateUnitLocation,
    });
}

export const unitService = createUnitService({
    unitRepository: defaultUnitRepository,
    hotelRepository: defaultHotelRepository,
    systemSettingRepository: defaultSystemSettingRepository,
    transactionRunner: defaultTransactionRunner,
    geocodingService: defaultGeocodingService,
    logger: defaultLogger,
});
