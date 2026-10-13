function readFirstForwardedAddress(headers) {
    const forwardedFor = headers.get("x-forwarded-for") ?? "";
    const [firstAddress] = forwardedFor.split(",");
    return firstAddress.trim() || null;
}

export function getRequestContext(request) {
    const { headers } = request;
    return {
        requestId: headers.get("x-request-id"),
        ipAddress:
            readFirstForwardedAddress(headers) ?? headers.get("x-real-ip"),
        userAgent: headers.get("user-agent"),
    };
}
