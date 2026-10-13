import { HOTEL_STATUSES } from "../../constants/hotel-statuses.js";
import { ConflictError, ERROR_CODES } from "../../lib/errors.js";

export const HOTEL_ACTIONS = Object.freeze({
    SUBMIT_REVIEW: "SUBMIT_REVIEW",
    APPROVE: "APPROVE",
    REQUEST_CHANGES: "REQUEST_CHANGES",
    BLOCK: "BLOCK",
    UNBLOCK: "UNBLOCK",
});

export const UNBLOCK_TARGET_STATUSES = Object.freeze([
    HOTEL_STATUSES.PUBLISHED,
    HOTEL_STATUSES.DRAFT,
]);

const EDITABLE_STATUSES = Object.freeze([HOTEL_STATUSES.DRAFT]);

const OPERABLE_STATUSES = Object.freeze([
    HOTEL_STATUSES.DRAFT,
    HOTEL_STATUSES.PUBLISHED,
]);

const ACTIONS_WITH_REVIEW_NOTE = Object.freeze([
    HOTEL_ACTIONS.REQUEST_CHANGES,
    HOTEL_ACTIONS.BLOCK,
    HOTEL_ACTIONS.UNBLOCK,
]);

function freezeTargets(...statuses) {
    return Object.freeze(statuses);
}

const ALLOWED_TARGETS = Object.freeze({
    [HOTEL_ACTIONS.SUBMIT_REVIEW]: Object.freeze({
        [HOTEL_STATUSES.DRAFT]: freezeTargets(HOTEL_STATUSES.UNDER_REVIEW),
    }),
    [HOTEL_ACTIONS.APPROVE]: Object.freeze({
        [HOTEL_STATUSES.UNDER_REVIEW]: freezeTargets(HOTEL_STATUSES.PUBLISHED),
    }),
    [HOTEL_ACTIONS.REQUEST_CHANGES]: Object.freeze({
        [HOTEL_STATUSES.UNDER_REVIEW]: freezeTargets(HOTEL_STATUSES.DRAFT),
    }),
    [HOTEL_ACTIONS.BLOCK]: Object.freeze({
        [HOTEL_STATUSES.PUBLISHED]: freezeTargets(HOTEL_STATUSES.BLOCKED),
        [HOTEL_STATUSES.UNDER_REVIEW]: freezeTargets(HOTEL_STATUSES.BLOCKED),
    }),
    [HOTEL_ACTIONS.UNBLOCK]: Object.freeze({
        [HOTEL_STATUSES.BLOCKED]: UNBLOCK_TARGET_STATUSES,
    }),
});

export function createInvalidHotelStatusError() {
    return new ConflictError(
        ERROR_CODES.INVALID_HOTEL_STATUS,
        "A ação não é permitida para o status atual do hotel.",
    );
}

export function resolveNextStatus(action, currentStatus, requestedStatus) {
    const targets = ALLOWED_TARGETS[action]?.[currentStatus];
    if (!targets) {
        throw createInvalidHotelStatusError();
    }

    const nextStatus = targets.length === 1 ? targets[0] : requestedStatus;
    if (!targets.includes(nextStatus)) {
        throw createInvalidHotelStatusError();
    }
    return nextStatus;
}

export function canEditHotel(status) {
    return EDITABLE_STATUSES.includes(status);
}

export function canOperateHotel(status) {
    return OPERABLE_STATUSES.includes(status);
}

export function shouldRecordReviewNote(action) {
    return ACTIONS_WITH_REVIEW_NOTE.includes(action);
}
