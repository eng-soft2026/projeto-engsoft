const ZIP_CODE_LENGTH = 8;

export function normalizeZipCode(value) {
    return String(value).replace(/\D/g, "");
}

export function isValidZipCode(value) {
    return normalizeZipCode(value).length === ZIP_CODE_LENGTH;
}

const ZIP_CODE_PREFIX_LENGTH = 5;

export function formatZipCode(value) {
    const digits = normalizeZipCode(value).slice(0, ZIP_CODE_LENGTH);
    if (digits.length <= ZIP_CODE_PREFIX_LENGTH) {
        return digits;
    }
    return `${digits.slice(0, ZIP_CODE_PREFIX_LENGTH)}-${digits.slice(ZIP_CODE_PREFIX_LENGTH)}`;
}
