import { logger as defaultLogger } from "./logger.js";
import { REQUEST_ID_HEADER, resolveRequestId } from "./request-id.js";
import { runWithRequestStore } from "./request-store.js";

export const REQUEST_LOG_MESSAGE = "HTTP request";
const UNHANDLED_ERROR_STATUS = 500;

function readMonotonicTime() {
    return performance.now();
}

export function withRequestIdHeader(response, requestId) {
    const headers = new Headers(response.headers);
    headers.set(REQUEST_ID_HEADER, requestId);
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

export function withRequestLogging(
    route,
    handler,
    { logger = defaultLogger, now = readMonotonicTime } = {},
) {
    return async function handleWithRequestLogging(request, context) {
        const requestId = resolveRequestId(
            request.headers.get(REQUEST_ID_HEADER),
        );
        const startedAt = now();
        const logRequest = (status) => {
            logger.info(REQUEST_LOG_MESSAGE, {
                requestId,
                route,
                method: request.method,
                status,
                durationMs: Math.round(now() - startedAt),
            });
        };

        return runWithRequestStore({ requestId, route }, async () => {
            try {
                const response = await handler(request, context);
                logRequest(response.status);
                return withRequestIdHeader(response, requestId);
            } catch (error) {
                logRequest(UNHANDLED_ERROR_STATUS);
                throw error;
            }
        });
    };
}
