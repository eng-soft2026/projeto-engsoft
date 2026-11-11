import { describe, expect, it } from "vitest";
import {
    formatPhone,
    isValidBrazilianPhone,
    normalizePhone,
} from "../../src/utils/brazilian-phone.js";

describe("brazilian phone", () => {
    it.each(["(11) 91234-5678", "11912345678", "(21) 2345-6789", "2123456789"])(
        "accepts %s",
        (value) => {
            expect(isValidBrazilianPhone(value)).toBe(true);
        },
    );

    it.each([
        "",
        "123",
        "(01) 91234-5678",
        "(11) 81234-5678",
        "(11) 1234-5678",
        "119123456789",
        "abcdefghijk",
    ])("rejects %s", (value) => {
        expect(isValidBrazilianPhone(value)).toBe(false);
    });

    it("keeps only the digits", () => {
        expect(normalizePhone("(11) 91234-5678")).toBe("11912345678");
    });

    it.each([
        ["", ""],
        ["1", "(1"],
        ["11", "(11"],
        ["113", "(11) 3"],
        ["113333", "(11) 3333"],
        ["1133334", "(11) 3333-4"],
        ["1133334444", "(11) 3333-4444"],
        ["11988887777", "(11) 98888-7777"],
        ["(11) 98888-77779", "(11) 98888-7777"],
    ])("masks %s as %s", (value, expected) => {
        expect(formatPhone(value)).toBe(expected);
    });
});
