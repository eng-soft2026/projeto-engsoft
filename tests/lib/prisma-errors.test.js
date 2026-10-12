import { describe, expect, it } from "vitest";
import { isUniqueConstraintViolation } from "../../src/lib/prisma-errors.js";

describe("isUniqueConstraintViolation", () => {
    it("detects the Prisma unique constraint code P2002", () => {
        expect(isUniqueConstraintViolation({ code: "P2002" })).toBe(true);
    });

    it("ignores other errors", () => {
        expect(isUniqueConstraintViolation({ code: "P2025" })).toBe(false);
        expect(isUniqueConstraintViolation(new Error("boom"))).toBe(false);
        expect(isUniqueConstraintViolation(undefined)).toBe(false);
    });
});
