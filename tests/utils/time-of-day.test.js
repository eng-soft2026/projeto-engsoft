import { describe, expect, it } from "vitest";
import {
    dateToTimeOfDay,
    isValidTimeOfDay,
    timeOfDayToDate,
} from "../../src/utils/time-of-day.js";

describe("time of day", () => {
    it.each(["00:00", "09:30", "14:00", "23:59"])("accepts %s", (value) => {
        expect(isValidTimeOfDay(value)).toBe(true);
    });

    it.each([
        "24:00",
        "12:60",
        "9:30",
        "12:5",
        "12:30:00",
        "",
        "abc",
        null,
        1230,
    ])("rejects %s", (value) => {
        expect(isValidTimeOfDay(value)).toBe(false);
    });

    it("converts to the UTC reference date used by the TIME column", () => {
        expect(timeOfDayToDate("14:30").toISOString()).toBe(
            "1970-01-01T14:30:00.000Z",
        );
    });

    it("round trips through the Date value", () => {
        expect(dateToTimeOfDay(timeOfDayToDate("06:05"))).toBe("06:05");
    });
});
