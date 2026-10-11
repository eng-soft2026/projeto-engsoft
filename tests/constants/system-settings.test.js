import { describe, expect, it } from "vitest";
import { SettingValueType } from "../../src/generated/prisma/enums.ts";
import {
    DEFAULT_SYSTEM_SETTINGS,
    SYSTEM_SETTING_KEYS,
} from "../../src/constants/system-settings.js";

describe("DEFAULT_SYSTEM_SETTINGS", () => {
    it("uses the default values from the database model", () => {
        const valuesByKey = Object.fromEntries(
            DEFAULT_SYSTEM_SETTINGS.map(({ key, value }) => [key, value]),
        );

        expect(valuesByKey).toEqual({
            PLATFORM_COMMISSION_PERCENT: "10",
            SERVICE_FEE_PERCENT: "10",
            MAX_OVERBOOKING_PERCENT: "10",
            RESERVATION_HOLD_MINUTES: "15",
            MAX_BOOKING_ADVANCE_DAYS: "365",
            JOB_RETRY_MINUTES: "30",
            MAX_JOB_ATTEMPTS: "3",
        });
    });

    it("covers every setting key exactly once", () => {
        const keys = DEFAULT_SYSTEM_SETTINGS.map(({ key }) => key);

        expect(new Set(keys).size).toBe(keys.length);
        expect([...keys].sort()).toEqual(
            Object.values(SYSTEM_SETTING_KEYS).sort(),
        );
    });

    it("stores integer settings as integer strings", () => {
        for (const setting of DEFAULT_SYSTEM_SETTINGS) {
            expect(setting.valueType).toBe(SettingValueType.INTEGER);
            expect(setting.value).toMatch(/^\d+$/);
        }
    });

    it("cannot be changed at runtime", () => {
        expect(Object.isFrozen(DEFAULT_SYSTEM_SETTINGS)).toBe(true);
        expect(Object.isFrozen(DEFAULT_SYSTEM_SETTINGS[0])).toBe(true);
    });
});
