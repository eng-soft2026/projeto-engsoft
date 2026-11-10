import { describe, expect, it } from "vitest";
import { formatCpf, isValidCpf, normalizeCpf } from "../../src/utils/cpf.js";

describe("normalizeCpf", () => {
    it("keeps only the digits", () => {
        expect(normalizeCpf("529.982.247-25")).toBe("52998224725");
    });

    it("keeps an already normalized CPF", () => {
        expect(normalizeCpf("52998224725")).toBe("52998224725");
    });
});

describe("isValidCpf", () => {
    it.each(["529.982.247-25", "52998224725", "111.444.777-35", "12345678909"])(
        "accepts the valid CPF %s",
        (cpf) => {
            expect(isValidCpf(cpf)).toBe(true);
        },
    );

    it("rejects a wrong first check digit", () => {
        expect(isValidCpf("529.982.247-35")).toBe(false);
    });

    it("rejects a wrong second check digit", () => {
        expect(isValidCpf("529.982.247-26")).toBe(false);
    });

    it.each(["000.000.000-00", "11111111111", "99999999999"])(
        "rejects the repeated digits %s",
        (cpf) => {
            expect(isValidCpf(cpf)).toBe(false);
        },
    );

    it.each(["5299822472", "529982247250", "529.982.247/25", "abc52998224725"])(
        "rejects the malformed value %s",
        (cpf) => {
            expect(isValidCpf(cpf)).toBe(false);
        },
    );

    it("rejects values that are not strings", () => {
        expect(isValidCpf(52998224725)).toBe(false);
        expect(isValidCpf(undefined)).toBe(false);
    });
});

describe("formatCpf", () => {
    it("adds the mask to a normalized CPF", () => {
        expect(formatCpf("52998224725")).toBe("529.982.247-25");
    });

    it("keeps an already masked CPF", () => {
        expect(formatCpf("529.982.247-25")).toBe("529.982.247-25");
    });

    it("returns the digits when there are not 11 of them", () => {
        expect(formatCpf("1234")).toBe("1234");
    });
});
