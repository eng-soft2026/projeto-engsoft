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
import { hotelPolicyRepository as defaultHotelPolicyRepository } from "../repositories/hotel-policy-repository.js";
import { hotelRepository as defaultHotelRepository } from "../repositories/hotel-repository.js";

function createHotelNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.HOTEL_NOT_FOUND,
        "Hotel não encontrado.",
    );
}

function createPolicyNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.POLICY_NOT_FOUND,
        "Política não encontrada.",
    );
}

export function presentPolicy(policy) {
    const presented = { ...policy };
    delete presented.hotel;
    return presented;
}

function buildChanges({ type, title, description, isActive }) {
    const data = { type, title, description, isActive };
    return Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined),
    );
}

export function createPolicyService({
    hotelPolicyRepository,
    hotelRepository,
    transactionRunner,
}) {
    function assertHotelIsEditable(hotel) {
        if (!canEditHotel(hotel.status)) {
            throw createInvalidHotelStatusError();
        }
    }

    async function findManagedHotelOrThrow(manager, hotelId, client) {
        const hotel = await hotelRepository.findById(hotelId, client);
        if (!hotel || !canManageHotel(manager, hotel)) {
            throw createHotelNotFoundError();
        }
        return hotel;
    }

    async function findManagedPolicyOrThrow(manager, policyId, client) {
        const policy = await hotelPolicyRepository.findByIdWithHotel(
            policyId,
            client,
        );
        if (!policy || !canManageHotel(manager, policy.hotel)) {
            throw createPolicyNotFoundError();
        }
        return policy;
    }

    async function createPolicy(manager, hotelId, input) {
        const hotel = await findManagedHotelOrThrow(manager, hotelId);
        assertHotelIsEditable(hotel);

        return transactionRunner.run(async (client) => {
            const current = await findManagedHotelOrThrow(
                manager,
                hotelId,
                client,
            );
            assertHotelIsEditable(current);
            return hotelPolicyRepository.create({ hotelId, ...input }, client);
        });
    }

    async function listPolicies(user, hotelId) {
        const hotel = await hotelRepository.findById(hotelId);
        if (!hotel || !canViewHotel(user, hotel)) {
            throw createHotelNotFoundError();
        }
        return hotelPolicyRepository.listByHotel(hotelId);
    }

    async function getPolicy(user, policyId) {
        const policy = await hotelPolicyRepository.findByIdWithHotel(policyId);
        if (!policy || !canViewHotel(user, policy.hotel)) {
            throw createPolicyNotFoundError();
        }
        return presentPolicy(policy);
    }

    async function updatePolicy(manager, policyId, changes) {
        const policy = await findManagedPolicyOrThrow(manager, policyId);
        assertHotelIsEditable(policy.hotel);

        await transactionRunner.run(async (client) => {
            const current = await findManagedPolicyOrThrow(
                manager,
                policyId,
                client,
            );
            assertHotelIsEditable(current.hotel);
            await hotelPolicyRepository.updateFields(
                policyId,
                { ...buildChanges(changes), updatedAt: new Date() },
                client,
            );
        });
        return getPolicy(manager, policyId);
    }

    return Object.freeze({
        createPolicy,
        listPolicies,
        getPolicy,
        updatePolicy,
    });
}

export const policyService = createPolicyService({
    hotelPolicyRepository: defaultHotelPolicyRepository,
    hotelRepository: defaultHotelRepository,
    transactionRunner: defaultTransactionRunner,
});
