import { describe, expect, it } from "vitest";
import { HOTEL_STATUSES } from "../../../src/constants/hotel-statuses.js";
import {
    getHotelStatusLabel,
    getHotelStatusTone,
} from "../../../src/modules/hotels/hotel-status-labels.js";

describe("hotel status labels", () => {
    it.each([
        [HOTEL_STATUSES.DRAFT, "Rascunho", "neutral"],
        [HOTEL_STATUSES.UNDER_REVIEW, "Em análise", "warning"],
        [HOTEL_STATUSES.PUBLISHED, "Publicado", "success"],
        [HOTEL_STATUSES.BLOCKED, "Bloqueado", "danger"],
    ])("labels %s as %s with the %s tone", (status, label, tone) => {
        expect(getHotelStatusLabel(status)).toBe(label);
        expect(getHotelStatusTone(status)).toBe(tone);
    });

    it("covers every hotel status", () => {
        for (const status of Object.values(HOTEL_STATUSES)) {
            expect(getHotelStatusLabel(status)).not.toBe(status);
        }
    });

    it("falls back for an unknown status", () => {
        expect(getHotelStatusLabel("ARCHIVED")).toBe("ARCHIVED");
        expect(getHotelStatusTone("ARCHIVED")).toBe("neutral");
    });
});
