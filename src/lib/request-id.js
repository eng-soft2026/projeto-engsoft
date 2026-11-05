export const REQUEST_ID_HEADER = "x-request-id";
export const REQUEST_ID_MAX_LENGTH = 64;

const REQUEST_ID_PATTERN = /^[\w.:-]+$/;

export function isValidRequestId(value) {
    return (
        typeof value === "string" &&
        value.length <= REQUEST_ID_MAX_LENGTH &&
        REQUEST_ID_PATTERN.test(value)
    );
}

export function generateRequestId() {
    return crypto.randomUUID();
}

export function resolveRequestId(value, generateId = generateRequestId) {
    return isValidRequestId(value) ? value : generateId();
}
