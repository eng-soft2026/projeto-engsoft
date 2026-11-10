import { createHash } from "node:crypto";
import { CredentialsSignin } from "next-auth";
import { describe, expect, it } from "vitest";
import { LOGIN_RATE_LIMIT } from "../../../src/constants/login-rate-limit.js";
import {
    LOGIN_RATE_LIMITED_CODE,
    LoginRateLimitedError,
    UNKNOWN_IP_ADDRESS,
    buildLoginAttemptKey,
} from "../../../src/modules/auth/login-rate-limit.js";

const EMAIL = "ana@example.com";
const EMAIL_HASH = createHash("sha256").update(EMAIL).digest("hex");

function createRequest(headers = {}) {
    return new Request("http://localhost/api/auth/callback/credentials", {
        headers,
    });
}

describe("LOGIN_RATE_LIMIT", () => {
    it("allows 5 failures in a 15-minute window", () => {
        expect(LOGIN_RATE_LIMIT).toEqual({
            keyPrefix: "login-attempts",
            maxAttempts: 5,
            windowSeconds: 900,
        });
        expect(Object.isFrozen(LOGIN_RATE_LIMIT)).toBe(true);
    });
});

describe("buildLoginAttemptKey", () => {
    it("combines the first forwarded IP with the hashed e-mail", () => {
        const key = buildLoginAttemptKey({
            email: EMAIL,
            request: createRequest({
                "x-forwarded-for": "203.0.113.7, 10.0.0.1",
            }),
        });

        expect(key).toBe(`203.0.113.7:${EMAIL_HASH}`);
    });

    it("never stores the e-mail in clear text", () => {
        const key = buildLoginAttemptKey({
            email: EMAIL,
            request: createRequest(),
        });

        expect(key).not.toContain(EMAIL);
    });

    it("falls back to x-real-ip", () => {
        const key = buildLoginAttemptKey({
            email: EMAIL,
            request: createRequest({ "x-real-ip": "198.51.100.4" }),
        });

        expect(key).toBe(`198.51.100.4:${EMAIL_HASH}`);
    });

    it.each([
        ["a request without IP headers", createRequest()],
        ["no request", undefined],
    ])("uses an unknown IP for %s", (_, request) => {
        expect(buildLoginAttemptKey({ email: EMAIL, request })).toBe(
            `${UNKNOWN_IP_ADDRESS}:${EMAIL_HASH}`,
        );
    });
});

describe("LoginRateLimitedError", () => {
    it("is a CredentialsSignin with its own code and the retry delay", () => {
        const error = new LoginRateLimitedError(120);

        expect(error).toBeInstanceOf(CredentialsSignin);
        expect(error.code).toBe(LOGIN_RATE_LIMITED_CODE);
        expect(error.retryAfterSeconds).toBe(120);
    });
});
