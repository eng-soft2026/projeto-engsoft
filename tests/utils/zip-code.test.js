import { describe, expect, it } from "vitest";
import { isValidZipCode, normalizeZipCode } from "../../src/utils/zip-code.js";

describe("zip code", () => {
    it("accepts a CEP with or without mask", () => {
        expect(isValidZipCode("01310-100")).toBe(true);
        expect(isValidZipCode("01310100")).toBe(true);
    });

    it.each(["", "0131010", "013101000", "abcdefgh"])("rejects %s", (value) => {
        expect(isValidZipCode(value)).toBe(false);
    });

    it("keeps only the digits", () => {
        expect(normalizeZipCode("01310-100")).toBe("01310100");
    });
});
