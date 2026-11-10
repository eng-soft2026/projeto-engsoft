import { createHash } from "node:crypto";
import {
    FORGOT_PASSWORD_RATE_LIMIT,
    RESET_PASSWORD_RATE_LIMIT,
} from "../../constants/password-reset.js";
import { createRateLimiter } from "../../lib/rate-limiter.js";

export const UNKNOWN_IP_ADDRESS = "unknown";

function hashEmail(email) {
    return createHash("sha256").update(email).digest("hex");
}

function normalizeIpAddress(ipAddress) {
    return ipAddress || UNKNOWN_IP_ADDRESS;
}

export function buildForgotPasswordKey({ email, ipAddress }) {
    return `${normalizeIpAddress(ipAddress)}:${hashEmail(email)}`;
}

export function buildResetPasswordKey({ ipAddress }) {
    return normalizeIpAddress(ipAddress);
}

export const forgotPasswordRateLimiter = createRateLimiter(
    FORGOT_PASSWORD_RATE_LIMIT,
);

export const resetPasswordRateLimiter = createRateLimiter(
    RESET_PASSWORD_RATE_LIMIT,
);
