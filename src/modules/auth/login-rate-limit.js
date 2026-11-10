import { createHash } from "node:crypto";
import { CredentialsSignin } from "next-auth";
import { LOGIN_RATE_LIMIT } from "../../constants/login-rate-limit.js";
import { createRateLimiter } from "../../lib/rate-limiter.js";
import { getRequestContext } from "../../lib/request-context.js";

export const UNKNOWN_IP_ADDRESS = "unknown";
export const LOGIN_RATE_LIMITED_CODE = "rate_limited";

export class LoginRateLimitedError extends CredentialsSignin {
    code = LOGIN_RATE_LIMITED_CODE;

    constructor(retryAfterSeconds) {
        super();
        this.retryAfterSeconds = retryAfterSeconds;
    }
}

function hashEmail(email) {
    return createHash("sha256").update(email).digest("hex");
}

function readIpAddress(request) {
    if (!request) {
        return UNKNOWN_IP_ADDRESS;
    }
    return getRequestContext(request).ipAddress || UNKNOWN_IP_ADDRESS;
}

export function buildLoginAttemptKey({ email, request }) {
    return `${readIpAddress(request)}:${hashEmail(email)}`;
}

export const loginRateLimiter = createRateLimiter(LOGIN_RATE_LIMIT);
