import { describe, expect, it } from "vitest";
import { HOTEL_STATUSES } from "../../../src/constants/hotel-statuses.js";
import { ConflictError } from "../../../src/lib/errors.js";
import {
    HOTEL_ACTIONS,
    UNBLOCK_TARGET_STATUSES,
    canEditHotel,
    canOperateHotel,
    resolveNextStatus,
    shouldRecordReviewNote,
} from "../../../src/modules/hotels/hotel-status-machine.js";

const { DRAFT, UNDER_REVIEW, PUBLISHED, BLOCKED } = HOTEL_STATUSES;

const ALLOWED_TRANSITIONS = [
    [HOTEL_ACTIONS.SUBMIT_REVIEW, DRAFT, undefined, UNDER_REVIEW],
    [HOTEL_ACTIONS.APPROVE, UNDER_REVIEW, undefined, PUBLISHED],
    [HOTEL_ACTIONS.REQUEST_CHANGES, UNDER_REVIEW, undefined, DRAFT],
    [HOTEL_ACTIONS.BLOCK, PUBLISHED, undefined, BLOCKED],
    [HOTEL_ACTIONS.BLOCK, UNDER_REVIEW, undefined, BLOCKED],
    [HOTEL_ACTIONS.UNBLOCK, BLOCKED, PUBLISHED, PUBLISHED],
    [HOTEL_ACTIONS.UNBLOCK, BLOCKED, DRAFT, DRAFT],
];

function isAllowed(action, status) {
    return ALLOWED_TRANSITIONS.some(
        ([allowedAction, from]) => allowedAction === action && from === status,
    );
}

const FORBIDDEN_COMBINATIONS = Object.values(HOTEL_ACTIONS).flatMap((action) =>
    Object.values(HOTEL_STATUSES)
        .filter((status) => !isAllowed(action, status))
        .map((status) => [action, status]),
);

function captureError(run) {
    try {
        run();
    } catch (error) {
        return error;
    }
    return null;
}

describe("resolveNextStatus", () => {
    it.each(ALLOWED_TRANSITIONS)(
        "%s moves a %s hotel (requested %s) to %s",
        (action, currentStatus, requestedStatus, expectedStatus) => {
            expect(
                resolveNextStatus(action, currentStatus, requestedStatus),
            ).toBe(expectedStatus);
        },
    );

    it.each(FORBIDDEN_COMBINATIONS)(
        "rejects %s when the hotel is %s with INVALID_HOTEL_STATUS",
        (action, currentStatus) => {
            const error = captureError(() =>
                resolveNextStatus(action, currentStatus, PUBLISHED),
            );

            expect(error).toBeInstanceOf(ConflictError);
            expect(error.code).toBe("INVALID_HOTEL_STATUS");
        },
    );

    it("rejects an unknown action", () => {
        const error = captureError(() =>
            resolveNextStatus("DELETE", DRAFT, undefined),
        );

        expect(error).toBeInstanceOf(ConflictError);
    });

    it("ignores the requested status when the action has a single target (RN105)", () => {
        expect(
            resolveNextStatus(
                HOTEL_ACTIONS.REQUEST_CHANGES,
                UNDER_REVIEW,
                PUBLISHED,
            ),
        ).toBe(DRAFT);
    });

    describe("unblock (RN106)", () => {
        it.each([UNDER_REVIEW, BLOCKED, undefined, "ARCHIVED"])(
            "needs an explicit PUBLISHED or DRAFT target, never %s",
            (requestedStatus) => {
                const error = captureError(() =>
                    resolveNextStatus(
                        HOTEL_ACTIONS.UNBLOCK,
                        BLOCKED,
                        requestedStatus,
                    ),
                );

                expect(error).toBeInstanceOf(ConflictError);
                expect(error.code).toBe("INVALID_HOTEL_STATUS");
            },
        );

        it("lists exactly PUBLISHED and DRAFT as targets", () => {
            expect([...UNBLOCK_TARGET_STATUSES].sort()).toEqual([
                "DRAFT",
                "PUBLISHED",
            ]);
        });
    });
});

describe("canEditHotel", () => {
    it("allows editing only while the hotel is a DRAFT", () => {
        expect(canEditHotel(DRAFT)).toBe(true);
        expect(canEditHotel(UNDER_REVIEW)).toBe(false);
        expect(canEditHotel(PUBLISHED)).toBe(false);
        expect(canEditHotel(BLOCKED)).toBe(false);
    });
});

describe("canOperateHotel", () => {
    it("allows the daily operation of rooms in DRAFT and PUBLISHED only", () => {
        expect(canOperateHotel(DRAFT)).toBe(true);
        expect(canOperateHotel(PUBLISHED)).toBe(true);
        expect(canOperateHotel(UNDER_REVIEW)).toBe(false);
        expect(canOperateHotel(BLOCKED)).toBe(false);
    });
});

describe("shouldRecordReviewNote", () => {
    it.each([
        HOTEL_ACTIONS.REQUEST_CHANGES,
        HOTEL_ACTIONS.BLOCK,
        HOTEL_ACTIONS.UNBLOCK,
    ])("records a review note for %s", (action) => {
        expect(shouldRecordReviewNote(action)).toBe(true);
    });

    it.each([HOTEL_ACTIONS.SUBMIT_REVIEW, HOTEL_ACTIONS.APPROVE])(
        "does not record a review note for %s",
        (action) => {
            expect(shouldRecordReviewNote(action)).toBe(false);
        },
    );
});
