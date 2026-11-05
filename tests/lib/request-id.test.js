import { describe, expect, it } from "vitest";
import {
    REQUEST_ID_HEADER,
    REQUEST_ID_MAX_LENGTH,
    generateRequestId,
    isValidRequestId,
    resolveRequestId,
} from "../../src/lib/request-id.js";

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("request id", () => {
    it("uses the x-request-id header", () => {
        expect(REQUEST_ID_HEADER).toBe("x-request-id");
    });

    it.each([
        "req-123",
        "3f1c2a4e-8b7d-4c6a-9e21-5d0b7a1c9f33",
        "trace.abc:01_X",
        "a".repeat(REQUEST_ID_MAX_LENGTH),
    ])("accepts %s", (value) => {
        expect(isValidRequestId(value)).toBe(true);
    });

    it.each([
        ["an empty value", ""],
        ["a value with spaces", "req 123"],
        ["a value with a line break", "req\nforged log line"],
        ["a value with quotes", 'req"}'],
        ["a value longer than the column", "a".repeat(65)],
        ["a missing value", null],
        ["a non-string value", 123],
    ])("rejects %s", (_label, value) => {
        expect(isValidRequestId(value)).toBe(false);
    });

    it("generates a UUID", () => {
        expect(generateRequestId()).toMatch(UUID_PATTERN);
        expect(generateRequestId()).not.toBe(generateRequestId());
    });

    it("keeps a valid incoming id", () => {
        expect(resolveRequestId("req-123")).toBe("req-123");
    });

    it("generates a new id when the incoming one is missing or invalid", () => {
        expect(resolveRequestId(null)).toMatch(UUID_PATTERN);
        expect(resolveRequestId("bad id", () => "generated")).toBe("generated");
    });
});
