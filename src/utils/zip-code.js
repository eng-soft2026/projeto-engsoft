const ZIP_CODE_LENGTH = 8;

export function normalizeZipCode(value) {
    return String(value).replace(/\D/g, "");
}

export function isValidZipCode(value) {
    return normalizeZipCode(value).length === ZIP_CODE_LENGTH;
}
