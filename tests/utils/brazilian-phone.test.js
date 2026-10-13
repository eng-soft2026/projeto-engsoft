import { describe, expect, it } from "vitest";
import {
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
});
