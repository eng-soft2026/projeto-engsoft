import { describe, expect, it } from "vitest";
import { ROOM_STATUSES } from "../../../src/constants/room-statuses.js";
import {
    MANUAL_ROOM_STATUS_OPTIONS,
    formatFloor,
    getRoomStatusLabel,
    getRoomStatusTone,
} from "../../../src/modules/rooms/room-labels.js";

describe("room labels", () => {
    it("labels every room status", () => {
        for (const status of Object.values(ROOM_STATUSES)) {
            expect(getRoomStatusLabel(status)).not.toBe(status);
        }
        expect(getRoomStatusLabel(ROOM_STATUSES.MAINTENANCE)).toBe(
            "Em manutenção",
        );
        expect(getRoomStatusTone(ROOM_STATUSES.AVAILABLE)).toBe("success");
        expect(getRoomStatusTone("UNKNOWN")).toBe("neutral");
    });

    it("offers only the manual statuses", () => {
        expect(MANUAL_ROOM_STATUS_OPTIONS.map(({ value }) => value)).toEqual([
            ROOM_STATUSES.AVAILABLE,
            ROOM_STATUSES.UNAVAILABLE,
            ROOM_STATUSES.MAINTENANCE,
        ]);
    });

    it("formats the floor", () => {
        expect(formatFloor(0)).toBe("Térreo");
        expect(formatFloor(3)).toBe("3º andar");
        expect(formatFloor(-1)).toBe("-1º andar");
    });
});
