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

function logUnexpectedError(error) {
    console.error("Unexpected error in route handler", {
        name: error?.name,
        code: error?.code,
    });
}

export function jsonSuccess(data, status = 200) {
    return Response.json(successResponse(data), { status });
}

export function jsonError(error) {
    if (error instanceof DomainError) {
        return Response.json(errorResponse(error.code, error.message), {
            status: getHttpStatus(error),
        });
    }

    logUnexpectedError(error);
    return Response.json(
        errorResponse(ERROR_CODES.INTERNAL_ERROR, INTERNAL_ERROR_MESSAGE),
        { status: INTERNAL_ERROR_STATUS },
    );
}
