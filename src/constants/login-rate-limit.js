export const LOGIN_RATE_LIMIT = Object.freeze({
    keyPrefix: "login-attempts",
    maxAttempts: 5,
    windowSeconds: 15 * 60,
});
