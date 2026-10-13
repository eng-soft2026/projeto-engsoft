import { HOTEL_ACTIONS } from "./hotel-status-machine.js";

export const HOTEL_EVENT_TYPES = Object.freeze({
    SUBMITTED: "HOTEL_SUBMITTED",
    APPROVED: "HOTEL_APPROVED",
    CHANGES_REQUESTED: "HOTEL_CHANGES_REQUESTED",
    BLOCKED: "HOTEL_BLOCKED",
    UNBLOCKED: "HOTEL_UNBLOCKED",
});

const EVENT_TYPE_BY_ACTION = Object.freeze({
    [HOTEL_ACTIONS.SUBMIT_REVIEW]: HOTEL_EVENT_TYPES.SUBMITTED,
    [HOTEL_ACTIONS.APPROVE]: HOTEL_EVENT_TYPES.APPROVED,
    [HOTEL_ACTIONS.REQUEST_CHANGES]: HOTEL_EVENT_TYPES.CHANGES_REQUESTED,
    [HOTEL_ACTIONS.BLOCK]: HOTEL_EVENT_TYPES.BLOCKED,
    [HOTEL_ACTIONS.UNBLOCK]: HOTEL_EVENT_TYPES.UNBLOCKED,
});

export function buildHotelEvent({
    action,
    hotelId,
    actorUserId,
    fromStatus,
    toStatus,
    reason = null,
}) {
    return Object.freeze({
        type: EVENT_TYPE_BY_ACTION[action],
        hotelId,
        actorUserId,
        fromStatus,
        toStatus,
        reason,
        occurredAt: new Date(),
    });
}

export const noopHotelEventPublisher = Object.freeze({
    async publish() {},
});
