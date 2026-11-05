import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../constants/audit.js";
import { HOTEL_STATUSES } from "../constants/hotel-statuses.js";
import { USER_ROLES } from "../constants/user-roles.js";
import { ERROR_CODES, ForbiddenError, NotFoundError } from "../lib/errors.js";
import { logger as defaultLogger, serializeError } from "../lib/logger.js";
import { transactionRunner as defaultTransactionRunner } from "../lib/transaction.js";
import {
    auditLogger as defaultAuditLogger,
    normalizeAuditReason,
} from "../modules/audit/audit-logger.js";
import {
    canManageHotel,
    canViewHotel,
    canViewHotelManagers,
} from "../modules/hotels/hotel-access.js";
import {
    buildHotelEvent,
    noopHotelEventPublisher,
} from "../modules/hotels/hotel-events.js";
import {
    HOTEL_ACTIONS,
    canEditHotel,
    createInvalidHotelStatusError,
    resolveNextStatus,
    shouldRecordReviewNote,
} from "../modules/hotels/hotel-status-machine.js";
import { hotelRepository as defaultHotelRepository } from "../repositories/hotel-repository.js";
import { hotelReviewNoteRepository as defaultHotelReviewNoteRepository } from "../repositories/hotel-review-note-repository.js";

function createHotelNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.HOTEL_NOT_FOUND,
        "Hotel não encontrado.",
    );
}

function presentHotel(hotel) {
    const presented = { ...hotel };
    delete presented.managers;
    return presented;
}

function presentHotelDetail(user, hotel) {
    if (!canViewHotelManagers(user, hotel)) {
        return presentHotel(hotel);
    }
    return {
        ...hotel,
        managers: hotel.managers.map(({ user: manager }) => manager),
    };
}

function assertManager(user) {
    if (user.role !== USER_ROLES.MANAGER) {
        throw new ForbiddenError("Apenas gestores podem cadastrar hotéis.");
    }
}

function assertAdmin(user) {
    if (user.role !== USER_ROLES.ADMIN) {
        throw new ForbiddenError(
            "Você não tem permissão para acessar este recurso.",
        );
    }
}

export function createHotelService({
    hotelRepository,
    hotelReviewNoteRepository,
    auditLogger,
    transactionRunner,
    hotelEvents,
    logger = defaultLogger,
}) {
    async function publishEvent(event) {
        try {
            await hotelEvents.publish(event);
        } catch (error) {
            logger.error("Failed to publish hotel event", {
                type: event.type,
                error: serializeError(error),
            });
        }
    }

    async function findManagedHotelOrThrow(manager, hotelId) {
        const hotel = await hotelRepository.findById(hotelId);
        if (!hotel || !canManageHotel(manager, hotel)) {
            throw createHotelNotFoundError();
        }
        return hotel;
    }

    async function createHotel(
        owner,
        { name, description, category, cnpj, email },
    ) {
        assertManager(owner);
        return hotelRepository.create({
            ownerUserId: owner.id,
            name,
            description,
            category,
            cnpj,
            email,
            status: HOTEL_STATUSES.DRAFT,
        });
    }

    async function listManagedHotels(manager) {
        return hotelRepository.listByManager(manager.id);
    }

    async function listHotelsForReview(admin, { status } = {}) {
        assertAdmin(admin);
        return hotelRepository.listForReview({ status });
    }

    async function getHotel(user, hotelId) {
        const hotel = await hotelRepository.findByIdWithReviewNotes(hotelId);
        if (!hotel || !canViewHotel(user, hotel)) {
            throw createHotelNotFoundError();
        }
        return presentHotelDetail(user, hotel);
    }

    async function updateHotel(
        owner,
        hotelId,
        { name, description, category, cnpj, email },
    ) {
        const hotel = await findManagedHotelOrThrow(owner, hotelId);
        if (!canEditHotel(hotel.status)) {
            throw createInvalidHotelStatusError();
        }

        const wasUpdated = await hotelRepository.updateFieldsIfStatus(
            hotelId,
            hotel.status,
            { name, description, category, cnpj, email },
        );
        if (!wasUpdated) {
            throw createInvalidHotelStatusError();
        }
        return presentHotel(await hotelRepository.findById(hotelId));
    }

    async function submitForReview(owner, hotelId) {
        const hotel = await findManagedHotelOrThrow(owner, hotelId);
        const nextStatus = resolveNextStatus(
            HOTEL_ACTIONS.SUBMIT_REVIEW,
            hotel.status,
        );

        const wasUpdated = await hotelRepository.updateStatusIfCurrent(
            hotelId,
            hotel.status,
            nextStatus,
        );
        if (!wasUpdated) {
            throw createInvalidHotelStatusError();
        }

        const updatedHotel = await hotelRepository.findById(hotelId);
        await publishEvent(
            buildHotelEvent({
                action: HOTEL_ACTIONS.SUBMIT_REVIEW,
                hotelId,
                actorUserId: owner.id,
                fromStatus: hotel.status,
                toStatus: nextStatus,
            }),
        );
        return presentHotel(updatedHotel);
    }

    async function applyAdminAction({
        admin,
        hotelId,
        action,
        auditAction,
        reason,
        targetStatus,
        context,
    }) {
        assertAdmin(admin);
        const normalizedReason = normalizeAuditReason(reason);

        const transition = await transactionRunner.run(async (client) => {
            const hotel = await hotelRepository.findById(hotelId, client);
            if (!hotel) {
                throw createHotelNotFoundError();
            }

            const nextStatus = resolveNextStatus(
                action,
                hotel.status,
                targetStatus,
            );
            const wasUpdated = await hotelRepository.updateStatusIfCurrent(
                hotelId,
                hotel.status,
                nextStatus,
                client,
            );
            if (!wasUpdated) {
                throw createInvalidHotelStatusError();
            }

            if (shouldRecordReviewNote(action)) {
                await hotelReviewNoteRepository.create(
                    {
                        hotelId,
                        adminUserId: admin.id,
                        fromStatus: hotel.status,
                        toStatus: nextStatus,
                        notes: normalizedReason,
                    },
                    client,
                );
            }

            await auditLogger.recordAdminAction(
                {
                    admin,
                    action: auditAction,
                    entityType: AUDIT_ENTITY_TYPES.HOTEL,
                    entityId: hotelId,
                    beforeData: { status: hotel.status },
                    afterData: { status: nextStatus },
                    reason: normalizedReason,
                    context,
                },
                client,
            );

            return {
                hotel: presentHotel(
                    await hotelRepository.findById(hotelId, client),
                ),
                fromStatus: hotel.status,
                toStatus: nextStatus,
            };
        });

        await publishEvent(
            buildHotelEvent({
                action,
                hotelId,
                actorUserId: admin.id,
                fromStatus: transition.fromStatus,
                toStatus: transition.toStatus,
                reason: normalizedReason,
            }),
        );
        return transition.hotel;
    }

    function approveHotel(admin, hotelId, { reason }, context) {
        return applyAdminAction({
            admin,
            hotelId,
            action: HOTEL_ACTIONS.APPROVE,
            auditAction: AUDIT_ACTIONS.APPROVE,
            reason,
            context,
        });
    }

    function requestHotelChanges(admin, hotelId, { reason }, context) {
        return applyAdminAction({
            admin,
            hotelId,
            action: HOTEL_ACTIONS.REQUEST_CHANGES,
            auditAction: AUDIT_ACTIONS.REQUEST_CHANGES,
            reason,
            context,
        });
    }

    function blockHotel(admin, hotelId, { reason }, context) {
        return applyAdminAction({
            admin,
            hotelId,
            action: HOTEL_ACTIONS.BLOCK,
            auditAction: AUDIT_ACTIONS.BLOCK,
            reason,
            context,
        });
    }

    function unblockHotel(admin, hotelId, { reason, targetStatus }, context) {
        return applyAdminAction({
            admin,
            hotelId,
            action: HOTEL_ACTIONS.UNBLOCK,
            auditAction: AUDIT_ACTIONS.UNBLOCK,
            reason,
            targetStatus,
            context,
        });
    }

    return Object.freeze({
        createHotel,
        listManagedHotels,
        listHotelsForReview,
        getHotel,
        updateHotel,
        submitForReview,
        approveHotel,
        requestHotelChanges,
        blockHotel,
        unblockHotel,
    });
}

export const hotelService = createHotelService({
    hotelRepository: defaultHotelRepository,
    hotelReviewNoteRepository: defaultHotelReviewNoteRepository,
    auditLogger: defaultAuditLogger,
    transactionRunner: defaultTransactionRunner,
    hotelEvents: noopHotelEventPublisher,
    logger: defaultLogger,
});
