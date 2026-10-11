import { SettingValueType } from "../generated/prisma/enums.ts";

export const SYSTEM_SETTING_KEYS = Object.freeze({
    PLATFORM_COMMISSION_PERCENT: "PLATFORM_COMMISSION_PERCENT",
    SERVICE_FEE_PERCENT: "SERVICE_FEE_PERCENT",
    MAX_OVERBOOKING_PERCENT: "MAX_OVERBOOKING_PERCENT",
    RESERVATION_HOLD_MINUTES: "RESERVATION_HOLD_MINUTES",
    MAX_BOOKING_ADVANCE_DAYS: "MAX_BOOKING_ADVANCE_DAYS",
    JOB_RETRY_MINUTES: "JOB_RETRY_MINUTES",
    MAX_JOB_ATTEMPTS: "MAX_JOB_ATTEMPTS",
});

function createIntegerSetting(key, value) {
    return Object.freeze({
        key,
        value: String(value),
        valueType: SettingValueType.INTEGER,
    });
}

export const DEFAULT_SYSTEM_SETTINGS = Object.freeze([
    createIntegerSetting(SYSTEM_SETTING_KEYS.PLATFORM_COMMISSION_PERCENT, 10),
    createIntegerSetting(SYSTEM_SETTING_KEYS.SERVICE_FEE_PERCENT, 10),
    createIntegerSetting(SYSTEM_SETTING_KEYS.MAX_OVERBOOKING_PERCENT, 10),
    createIntegerSetting(SYSTEM_SETTING_KEYS.RESERVATION_HOLD_MINUTES, 15),
    createIntegerSetting(SYSTEM_SETTING_KEYS.MAX_BOOKING_ADVANCE_DAYS, 365),
    createIntegerSetting(SYSTEM_SETTING_KEYS.JOB_RETRY_MINUTES, 30),
    createIntegerSetting(SYSTEM_SETTING_KEYS.MAX_JOB_ATTEMPTS, 3),
]);
