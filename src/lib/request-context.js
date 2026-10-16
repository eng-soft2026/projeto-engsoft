import { REQUEST_ID_HEADER } from "./request-id.js";
import { getCurrentRequestId } from "./request-store.js";

function readFirstForwardedAddress(headers) {
    const forwardedFor = headers.get("x-forwarded-for") ?? "";
    const [firstAddress] = forwardedFor.split(",");
    return firstAddress.trim() || null;
}

export function getRequestContext(request) {
    const { headers } = request;
    return {
        requestId: getCurrentRequestId() ?? headers.get(REQUEST_ID_HEADER),
        ipAddress:
            readFirstForwardedAddress(headers) ?? headers.get("x-real-ip"),
        userAgent: headers.get("user-agent"),
    };
}
