import { errorResponse, successResponse } from "./api-response.js";
import {
    ConflictError,
    DomainError,
    ERROR_CODES,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
    ValidationError,
} from "./errors.js";
import { logger, serializeError } from "./logger.js";
import { getRequestContext } from "./request-context.js";
import { generateRequestId } from "./request-id.js";
import { getCurrentRequestId } from "./request-store.js";

const HTTP_STATUS_BY_ERROR_CLASS = [
    [ValidationError, 400],
    [UnauthorizedError, 401],
    [ForbiddenError, 403],
    [NotFoundError, 404],
    [ConflictError, 409],
];
const DEFAULT_DOMAIN_ERROR_STATUS = 400;
const INTERNAL_ERROR_STATUS = 500;
const INTERNAL_ERROR_MESSAGE =
    "Ocorreu um erro inesperado. Tente novamente mais tarde.";

export function getHttpStatus(error) {
    const match = HTTP_STATUS_BY_ERROR_CLASS.find(([ErrorClass]) => {
        return error instanceof ErrorClass;
    });
    return match ? match[1] : DEFAULT_DOMAIN_ERROR_STATUS;
}

function resolveRequestId(request) {
    const requestId = request
        ? getRequestContext(request).requestId
        : getCurrentRequestId();
    return requestId || generateRequestId();
}

function logUnexpectedError(error, request) {
    logger.error("Unexpected error in route handler", {
        requestId: resolveRequestId(request),
        error: serializeError(error),
    });
}

export function jsonSuccess(data, status = 200) {
    return Response.json(successResponse(data), { status });
}

export function jsonError(error, request) {
    if (error instanceof DomainError) {
        return Response.json(errorResponse(error.code, error.message), {
            status: getHttpStatus(error),
        });
    }

    logUnexpectedError(error, request);
    return Response.json(
        errorResponse(ERROR_CODES.INTERNAL_ERROR, INTERNAL_ERROR_MESSAGE),
        { status: INTERNAL_ERROR_STATUS },
    );
}
