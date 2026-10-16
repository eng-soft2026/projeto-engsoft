import { NextResponse } from "next/server";
import { REQUEST_ID_HEADER, resolveRequestId } from "./lib/request-id.js";

export function proxy(request) {
    const requestId = resolveRequestId(request.headers.get(REQUEST_ID_HEADER));
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(REQUEST_ID_HEADER, requestId);
    const response = NextResponse.next({
        request: { headers: requestHeaders },
    });
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
