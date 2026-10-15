const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export const DEFAULT_CLOCK_START = "2026-01-01T12:00:00.000Z";

function toTimestamp(value) {
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) {
        throw new TypeError(`Invalid clock date: ${value}`);
    }
    return timestamp;
}

function toMilliseconds({
    days = 0,
    hours = 0,
    minutes = 0,
    seconds = 0,
    milliseconds = 0,
}) {
    return (
        days * MS_PER_DAY +
        hours * MS_PER_HOUR +
        minutes * MS_PER_MINUTE +
        seconds * MS_PER_SECOND +
        milliseconds
    );
}

export function createFakeClock(start = DEFAULT_CLOCK_START) {
    let current = toTimestamp(start);

    return {
        now: () => new Date(current),
        advance(duration) {
            current += toMilliseconds(duration);
            return new Date(current);
        },
        set(date) {
            current = toTimestamp(date);
            return new Date(current);
        },
    };
}
