import { errorResponse, successResponse } from "../../lib/api-response.js";
import { ERROR_CODES } from "../../lib/errors.js";

export const HEALTH_STATUS = Object.freeze({
    OK: "ok",
    READY: "ready",
    NOT_READY: "not_ready",
});
export const SERVICE_UNAVAILABLE_MESSAGE = "Serviço indisponível no momento.";
const SERVICE_UNAVAILABLE_STATUS = 503;
const NO_STORE_HEADERS = Object.freeze({ "cache-control": "no-store" });

export function buildLivenessResponse() {
    return Response.json(successResponse({ status: HEALTH_STATUS.OK }), {
        status: 200,
        headers: NO_STORE_HEADERS,
    });
}

export function buildReadinessResponse({ isReady, components }) {
    if (isReady) {
        return Response.json(
            successResponse({ status: HEALTH_STATUS.READY, components }),
            { status: 200, headers: NO_STORE_HEADERS },
        );
    }

    const body = {
        ...errorResponse(
            ERROR_CODES.SERVICE_UNAVAILABLE,
            SERVICE_UNAVAILABLE_MESSAGE,
        ),
        data: { status: HEALTH_STATUS.NOT_READY, components },
    };
    return Response.json(body, {
        status: SERVICE_UNAVAILABLE_STATUS,
        headers: NO_STORE_HEADERS,
    });
}
