import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
    generatePasswordResetToken,
    hashPasswordResetToken,
} from "../../../src/modules/auth/password-reset-token.js";

describe("generatePasswordResetToken", () => {
    it("returns 32 random bytes encoded as base64url", () => {
        const token = generatePasswordResetToken();

        expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
        expect(Buffer.from(token, "base64url")).toHaveLength(32);
    });

    it("never repeats a token", () => {
        const tokens = new Set(
            Array.from({ length: 50 }, () => generatePasswordResetToken()),
        );

        expect(tokens.size).toBe(50);
    });
});

describe("hashPasswordResetToken", () => {
    it("returns the SHA-256 hex digest, 64 characters", () => {
        const expected = createHash("sha256").update("abc").digest("hex");

        expect(hashPasswordResetToken("abc")).toBe(expected);
        expect(hashPasswordResetToken("abc")).toHaveLength(64);
    });
});
