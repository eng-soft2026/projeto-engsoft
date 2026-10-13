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
