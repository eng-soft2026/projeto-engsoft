const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const REFERENCE_DATE = "1970-01-01";

export function isValidTimeOfDay(value) {
    return typeof value === "string" && TIME_OF_DAY_PATTERN.test(value);
}

export function timeOfDayToDate(value) {
    return new Date(`${REFERENCE_DATE}T${value}:00.000Z`);
}

export function dateToTimeOfDay(date) {
    return date.toISOString().slice(11, 16);
}
