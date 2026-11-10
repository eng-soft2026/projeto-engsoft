export const PASSWORD_RESET_TOKEN_TTL_MINUTES = 60;
export const PASSWORD_RESET_TOKEN_BYTES = 32;

export const FORGOT_PASSWORD_RATE_LIMIT = Object.freeze({
    keyPrefix: "forgot-password-attempts",
    maxAttempts: 5,
    windowSeconds: 15 * 60,
});

export const RESET_PASSWORD_RATE_LIMIT = Object.freeze({
    keyPrefix: "reset-password-attempts",
    maxAttempts: 10,
    windowSeconds: 15 * 60,
});
