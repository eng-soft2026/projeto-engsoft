import { ERROR_CODES } from "./errors.js";

export const CLIENT_ERROR_CODES = Object.freeze({
    NETWORK_ERROR: "NETWORK_ERROR",
});

const LOGIN_PATH = "/login";
const UNAUTHORIZED_STATUS = 401;
const NETWORK_ERROR_STATUS = 0;

export class ApiError extends Error {
    constructor({ code, message = "", status, retryAfterSeconds = null }) {
        super(message);
        this.name = "ApiError";
        this.code = code;
        this.status = status;
        this.retryAfterSeconds = retryAfterSeconds;
    }
}

function isSameOriginPath(path) {
    return (
        typeof path === "string" &&
        path.startsWith("/") &&
        !path.startsWith("//") &&
        !path.startsWith("/\\")
    );
}

function buildRequestInit({ method = "GET", body, signal } = {}) {
    const headers = { Accept: "application/json" };
    const init = { method, headers, credentials: "same-origin", signal };
    if (body === undefined) {
        return init;
    }

    headers["Content-Type"] = "application/json";
    return { ...init, body: JSON.stringify(body) };
}

async function sendRequest(fetchImpl, path, init) {
    try {
        return await fetchImpl(path, init);
    } catch (error) {
        if (error?.name === "AbortError") {
            throw error;
        }
        throw new ApiError({
            code: CLIENT_ERROR_CODES.NETWORK_ERROR,
            status: NETWORK_ERROR_STATUS,
        });
    }
}

async function readPayload(response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

function readRetryAfterSeconds(response) {
    const value = response.headers.get("Retry-After");
    if (!value || !/^\d+$/.test(value.trim())) {
        return null;
    }
    return Number.parseInt(value, 10);
}

function buildResponseError(response, payload) {
    const envelopeError = payload?.success === false ? payload.error : null;
    if (envelopeError?.code) {
        return new ApiError({
            code: envelopeError.code,
            message: envelopeError.message,
            status: response.status,
            retryAfterSeconds: readRetryAfterSeconds(response),
        });
    }

    return new ApiError({
        code: ERROR_CODES.INTERNAL_ERROR,
        status: response.status,
    });
}

function isSessionMissing(error) {
    return (
        error.status === UNAUTHORIZED_STATUS &&
        error.code === ERROR_CODES.UNAUTHORIZED
    );
}

export function redirectToLogin() {
    const { pathname, search } = window.location;
    if (pathname === LOGIN_PATH) {
        return;
    }

    const callbackUrl = encodeURIComponent(`${pathname}${search}`);
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- apiFetch runs outside React and a lost session needs a full reload
    window.location.assign(`${LOGIN_PATH}?callbackUrl=${callbackUrl}`);
}

export function createApiClient({
    fetchImpl = (...args) => globalThis.fetch(...args),
    onUnauthorized = redirectToLogin,
} = {}) {
    return async function apiFetch(path, options) {
        if (!isSameOriginPath(path)) {
            throw new TypeError("apiFetch only accepts same-origin paths");
        }

        const response = await sendRequest(
            fetchImpl,
            path,
            buildRequestInit(options),
        );
        const payload = await readPayload(response);
        if (response.ok && payload?.success === true) {
            return payload.data;
        }

        const error = buildResponseError(response, payload);
        if (isSessionMissing(error)) {
            onUnauthorized();
        }
        throw error;
    };
}

export const apiFetch = createApiClient();
