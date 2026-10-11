export function successResponse(data) {
    return { success: true, data };
}

export function errorResponse(code, message) {
    return { success: false, error: { code, message } };
}
