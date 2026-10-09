const MS_PER_HOUR = 60 * 60 * 1000;
const MIN_NOTICE_IN_HOURS = 1;
const MAX_ADVANCE_IN_YEARS = 1;

function addYears(date, years) {
    const result = new Date(date);
    result.setUTCFullYear(result.getUTCFullYear() + years);
    return result;
}

function invalid(code) {
    return { isValid: false, code };
}

export function validateStay({ checkIn, checkOut, now }) {
    if (checkOut <= checkIn) {
        return invalid("INVALID_DATE_RANGE");
    }

    if (checkIn - now < MIN_NOTICE_IN_HOURS * MS_PER_HOUR) {
        return invalid("CHECKIN_TOO_SOON");
    }

    if (checkIn > addYears(now, MAX_ADVANCE_IN_YEARS)) {
        return invalid("CHECKIN_TOO_FAR");
    }

    return { isValid: true };
}
