import { ERROR_CODES, NotFoundError, ValidationError } from "../lib/errors.js";
import { transactionRunner as defaultTransactionRunner } from "../lib/transaction.js";
import {
    canManageHotel,
    canViewHotel,
} from "../modules/hotels/hotel-access.js";
import {
    canEditHotel,
    createInvalidHotelStatusError,
} from "../modules/hotels/hotel-status-machine.js";
import { hotelAcceptanceRepository as defaultHotelAcceptanceRepository } from "../repositories/hotel-acceptance-repository.js";
import { hotelRepository as defaultHotelRepository } from "../repositories/hotel-repository.js";

function createHotelNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.HOTEL_NOT_FOUND,
        "Hotel não encontrado.",
    );
}

function presentAcceptance({
    id,
    acceptanceType,
    customLabel,
    isAllowed,
    details,
}) {
    return {
        id,
        type: acceptanceType.code,
        typeName: acceptanceType.name,
        customLabel,
        isAllowed,
        details,
    };
}

export function createAcceptanceService({
    hotelAcceptanceRepository,
    hotelRepository,
    transactionRunner,
}) {
    async function findManagedHotelOrThrow(manager, hotelId, client) {
        const hotel = await hotelRepository.findById(hotelId, client);
        if (!hotel || !canManageHotel(manager, hotel)) {
            throw createHotelNotFoundError();
        }
        return hotel;
    }

    function assertHotelIsEditable(hotel) {
        if (!canEditHotel(hotel.status)) {
            throw createInvalidHotelStatusError();
        }
    }

    function buildRows(acceptances, types) {
        const typeIdByCode = new Map(types.map(({ id, code }) => [code, id]));
        return acceptances.map(({ type, customLabel, isAllowed, details }) => {
            const acceptanceTypeId = typeIdByCode.get(type);
            if (!acceptanceTypeId) {
                throw new ValidationError(
                    "Tipo de regra de aceitação indisponível.",
                );
            }
            return { acceptanceTypeId, customLabel, isAllowed, details };
        });
    }

    async function listAcceptances(user, hotelId) {
        const hotel = await hotelRepository.findById(hotelId);
        if (!hotel || !canViewHotel(user, hotel)) {
            throw createHotelNotFoundError();
        }
        const acceptances =
            await hotelAcceptanceRepository.listByHotel(hotelId);
        return acceptances.map(presentAcceptance);
    }

    async function replaceAcceptances(manager, hotelId, { acceptances }) {
        const hotel = await findManagedHotelOrThrow(manager, hotelId);
        assertHotelIsEditable(hotel);

        const stored = await transactionRunner.run(async (client) => {
            const current = await findManagedHotelOrThrow(
                manager,
                hotelId,
                client,
            );
            assertHotelIsEditable(current);

            const types = await hotelAcceptanceRepository.listTypes(client);
            await hotelAcceptanceRepository.replaceAll(
                hotelId,
                buildRows(acceptances, types),
                client,
            );
            return hotelAcceptanceRepository.listByHotel(hotelId, client);
        });
        return stored.map(presentAcceptance);
    }

    return Object.freeze({ listAcceptances, replaceAcceptances });
}

export const acceptanceService = createAcceptanceService({
    hotelAcceptanceRepository: defaultHotelAcceptanceRepository,
    hotelRepository: defaultHotelRepository,
    transactionRunner: defaultTransactionRunner,
});
