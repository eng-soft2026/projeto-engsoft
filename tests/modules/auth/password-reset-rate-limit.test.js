import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
    FORGOT_PASSWORD_RATE_LIMIT,
    PASSWORD_RESET_TOKEN_TTL_MINUTES,
    RESET_PASSWORD_RATE_LIMIT,
} from "../../../src/constants/password-reset.js";
import {
    UNKNOWN_IP_ADDRESS,
    buildForgotPasswordKey,
    buildResetPasswordKey,
} from "../../../src/modules/auth/password-reset-rate-limit.js";

const EMAIL = "ana@example.com";
const EMAIL_HASH = createHash("sha256").update(EMAIL).digest("hex");

describe("password reset limits", () => {
    it("keeps a token valid for 1 hour", () => {
        expect(PASSWORD_RESET_TOKEN_TTL_MINUTES).toBe(60);
    });

    it("allows 5 forgot-password requests and 10 invalid resets in 15 minutes", () => {
        expect(FORGOT_PASSWORD_RATE_LIMIT).toEqual({
            keyPrefix: "forgot-password-attempts",
            maxAttempts: 5,
            windowSeconds: 900,
        });
        expect(RESET_PASSWORD_RATE_LIMIT).toEqual({
            keyPrefix: "reset-password-attempts",
            maxAttempts: 10,
            windowSeconds: 900,
        });
    });
});

describe("buildForgotPasswordKey", () => {
    it("combines the IP with the hashed e-mail, never the e-mail in clear text", () => {
        const key = buildForgotPasswordKey({
            email: EMAIL,
            ipAddress: "203.0.113.7",
        });

        expect(key).toBe(`203.0.113.7:${EMAIL_HASH}`);
        expect(key).not.toContain(EMAIL);
    });

    it("uses a fixed placeholder without an IP", () => {
        expect(buildForgotPasswordKey({ email: EMAIL, ipAddress: null })).toBe(
            `${UNKNOWN_IP_ADDRESS}:${EMAIL_HASH}`,
        );
    });
});

describe("buildResetPasswordKey", () => {
    it("uses only the IP", () => {
        expect(buildResetPasswordKey({ ipAddress: "203.0.113.7" })).toBe(
            "203.0.113.7",
        );
        expect(buildResetPasswordKey({ ipAddress: null })).toBe(
            UNKNOWN_IP_ADDRESS,
        );
    });
});
