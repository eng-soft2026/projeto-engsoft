const AREA_CODE_PATTERN = /^[1-9][1-9]$/;
const LANDLINE_LENGTH = 10;
const MOBILE_LENGTH = 11;

export function normalizePhone(value) {
    return String(value).replace(/\D/g, "");
}

export function isValidBrazilianPhone(value) {
    const digits = normalizePhone(value);
    if (!AREA_CODE_PATTERN.test(digits.slice(0, 2))) {
        return false;
    }
    if (digits.length === LANDLINE_LENGTH) {
        return /^[2-5]/.test(digits.slice(2));
    }
    return digits.length === MOBILE_LENGTH && digits[2] === "9";
}

const AREA_CODE_LENGTH = 2;
const LANDLINE_PREFIX_LENGTH = 4;
const MOBILE_PREFIX_LENGTH = 5;

export function formatPhone(value) {
    const digits = normalizePhone(value).slice(0, MOBILE_LENGTH);
    const areaCode = digits.slice(0, AREA_CODE_LENGTH);
    const number = digits.slice(AREA_CODE_LENGTH);
    if (!digits) {
        return "";
    }
    if (!number) {
        return `(${areaCode}`;
    }
    const prefixLength =
        digits.length === MOBILE_LENGTH
            ? MOBILE_PREFIX_LENGTH
            : LANDLINE_PREFIX_LENGTH;
    if (number.length <= prefixLength) {
        return `(${areaCode}) ${number}`;
    }
    return `(${areaCode}) ${number.slice(0, prefixLength)}-${number.slice(prefixLength)}`;
}
