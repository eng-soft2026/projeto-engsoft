import { ERROR_CODES, ValidationError } from "../../lib/errors.js";

const MS_PER_HOUR = 60 * 60 * 1000;
const MIN_NOTICE_IN_HOURS = 1;
const MAX_ADVANCE_IN_YEARS = 1;

function addYears(date, years) {
    const result = new Date(date);
    result.setUTCFullYear(result.getUTCFullYear() + years);
    return result;
}

function invalidPeriod(message) {
    return new ValidationError(message, ERROR_CODES.INVALID_BOOKING_PERIOD);
}

export function validateStay({ checkIn, checkOut, now }) {
    if (checkOut <= checkIn) {
        throw invalidPeriod("Check-out must be after check-in.");
    }

    if (checkIn - now < MIN_NOTICE_IN_HOURS * MS_PER_HOUR) {
        throw invalidPeriod("Check-in must be at least 1 hour from now.");
    }

    if (checkIn > addYears(now, MAX_ADVANCE_IN_YEARS)) {
        throw invalidPeriod("Check-in must be at most 1 year from now.");
    }
}
