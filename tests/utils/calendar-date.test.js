import { describe, expect, it } from "vitest";
import {
    calendarDateToDate,
    dateToCalendarDate,
    formatCalendarDate,
    getCalendarDateInTimeZone,
    isValidCalendarDate,
} from "../../src/utils/calendar-date.js";

describe("calendar date", () => {
    it.each(["2026-12-20", "2028-02-29", "2027-01-01"])(
        "accepts %s",
        (value) => {
            expect(isValidCalendarDate(value)).toBe(true);
        },
    );

    it.each([
        "2026-02-30",
        "2027-02-29",
        "2026-13-01",
        "2026-1-01",
        "20/12/2026",
        "2026-12-20T00:00:00Z",
        "",
        null,
        20261220,
    ])("rejects %s", (value) => {
        expect(isValidCalendarDate(value)).toBe(false);
    });

    it("round-trips through the UTC midnight used by the DATE column", () => {
        const date = calendarDateToDate("2026-12-20");

        expect(date.toISOString()).toBe("2026-12-20T00:00:00.000Z");
        expect(dateToCalendarDate(date)).toBe("2026-12-20");
    });

    it("reads today in the given time zone", () => {
        const instant = new Date("2027-01-05T02:00:00.000Z");

        expect(getCalendarDateInTimeZone(instant, "America/Sao_Paulo")).toBe(
            "2027-01-04",
        );
        expect(getCalendarDateInTimeZone(instant, "UTC")).toBe("2027-01-05");
    });

    it("formats a calendar date for display", () => {
        expect(formatCalendarDate("2026-12-05")).toBe("05/12/2026");
    });
});
