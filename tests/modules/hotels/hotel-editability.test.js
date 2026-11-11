import { describe, expect, it } from "vitest";
import { HOTEL_STATUSES } from "../../../src/constants/hotel-statuses.js";
import { isHotelEditable } from "../../../src/modules/hotels/hotel-editability.js";
import { canEditHotel } from "../../../src/modules/hotels/hotel-status-machine.js";

describe("isHotelEditable", () => {
    it.each([
        [HOTEL_STATUSES.DRAFT, true],
        [HOTEL_STATUSES.UNDER_REVIEW, false],
        [HOTEL_STATUSES.PUBLISHED, false],
        [HOTEL_STATUSES.BLOCKED, false],
    ])("returns %s → %s, mirroring canEditHotel", (status, expected) => {
        expect(isHotelEditable(status)).toBe(expected);
        expect(isHotelEditable(status)).toBe(canEditHotel(status));
    });

    it("refuses an unknown status", () => {
        expect(isHotelEditable("ARCHIVED")).toBe(false);
    });
});
