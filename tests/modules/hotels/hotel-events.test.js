import { describe, expect, it } from "vitest";
import {
    HOTEL_EVENT_TYPES,
    buildHotelEvent,
    noopHotelEventPublisher,
} from "../../../src/modules/hotels/hotel-events.js";
import { HOTEL_ACTIONS } from "../../../src/modules/hotels/hotel-status-machine.js";

describe("buildHotelEvent", () => {
    it.each([
        [HOTEL_ACTIONS.SUBMIT_REVIEW, "HOTEL_SUBMITTED"],
        [HOTEL_ACTIONS.APPROVE, "HOTEL_APPROVED"],
        [HOTEL_ACTIONS.REQUEST_CHANGES, "HOTEL_CHANGES_REQUESTED"],
        [HOTEL_ACTIONS.BLOCK, "HOTEL_BLOCKED"],
        [HOTEL_ACTIONS.UNBLOCK, "HOTEL_UNBLOCKED"],
    ])("maps %s to the event %s", (action, type) => {
        const event = buildHotelEvent({
            action,
            hotelId: "hotel-1",
            actorUserId: "user-1",
            fromStatus: "DRAFT",
            toStatus: "UNDER_REVIEW",
        });

        expect(event.type).toBe(type);
    });

    it("carries the actor, the transition, the reason and the time", () => {
        const event = buildHotelEvent({
            action: HOTEL_ACTIONS.BLOCK,
            hotelId: "hotel-1",
            actorUserId: "admin-1",
            fromStatus: "PUBLISHED",
            toStatus: "BLOCKED",
            reason: "Documentos inválidos.",
        });

        expect(event).toMatchObject({
            hotelId: "hotel-1",
            actorUserId: "admin-1",
            fromStatus: "PUBLISHED",
            toStatus: "BLOCKED",
            reason: "Documentos inválidos.",
        });
        expect(event.occurredAt).toBeInstanceOf(Date);
    });

    it("defaults the reason to null for actions without one", () => {
        const event = buildHotelEvent({
            action: HOTEL_ACTIONS.SUBMIT_REVIEW,
            hotelId: "hotel-1",
            actorUserId: "user-1",
            fromStatus: "DRAFT",
            toStatus: "UNDER_REVIEW",
        });

        expect(event.reason).toBeNull();
    });

    it("builds a frozen event", () => {
        const event = buildHotelEvent({
            action: HOTEL_ACTIONS.APPROVE,
            hotelId: "hotel-1",
            actorUserId: "admin-1",
            fromStatus: "UNDER_REVIEW",
            toStatus: "PUBLISHED",
        });

        expect(Object.isFrozen(event)).toBe(true);
    });
});

describe("HOTEL_EVENT_TYPES", () => {
    it("covers the five hotel notifications of doc 13", () => {
        expect(Object.values(HOTEL_EVENT_TYPES).sort()).toEqual([
            "HOTEL_APPROVED",
            "HOTEL_BLOCKED",
            "HOTEL_CHANGES_REQUESTED",
            "HOTEL_SUBMITTED",
            "HOTEL_UNBLOCKED",
        ]);
    });
});

describe("noopHotelEventPublisher", () => {
    it("accepts an event and does nothing", async () => {
        await expect(
            noopHotelEventPublisher.publish({ type: "HOTEL_APPROVED" }),
        ).resolves.toBeUndefined();
    });
});
