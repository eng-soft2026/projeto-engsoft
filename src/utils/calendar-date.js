const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function calendarDateToDate(value) {
    return new Date(`${value}T00:00:00.000Z`);
}

export function dateToCalendarDate(date) {
    return date.toISOString().slice(0, 10);
}

export function isValidCalendarDate(value) {
    if (typeof value !== "string" || !CALENDAR_DATE_PATTERN.test(value)) {
        return false;
    }
    const date = calendarDateToDate(value);
    return !Number.isNaN(date.getTime()) && dateToCalendarDate(date) === value;
}

export function getCalendarDateInTimeZone(date, timeZone) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const valueOf = (type) => parts.find((part) => part.type === type).value;
    return `${valueOf("year")}-${valueOf("month")}-${valueOf("day")}`;
}
