import { describe, expect, it } from "vitest";
import { isValidCnpj, normalizeCnpj } from "../../src/utils/cnpj.js";

describe("normalizeCnpj", () => {
    it("keeps only the digits of a numeric CNPJ", () => {
        expect(normalizeCnpj("11.222.333/0001-81")).toBe("11222333000181");
    });

    it("uppercases the letters of an alphanumeric CNPJ", () => {
        expect(normalizeCnpj("12.abc.345/01de-35")).toBe("12ABC34501DE35");
    });

    it("keeps an already normalized CNPJ", () => {
        expect(normalizeCnpj("12ABC34501DE35")).toBe("12ABC34501DE35");
    });
});

describe("isValidCnpj", () => {
    it.each([
        "11.222.333/0001-81",
        "11222333000181",
        "00.000.000/0001-91",
        "12.ABC.345/01DE-35",
        "12ABC34501DE35",
        "12.abc.345/01de-35",
    ])("accepts the valid CNPJ %s", (cnpj) => {
        expect(isValidCnpj(cnpj)).toBe(true);
    });

    it("accepts the official alphanumeric example 12.ABC.345/01DE-35", () => {
        expect(isValidCnpj("12.ABC.345/01DE-35")).toBe(true);
    });

    it("rejects a wrong first check digit", () => {
        expect(isValidCnpj("12.ABC.345/01DE-45")).toBe(false);
        expect(isValidCnpj("11.222.333/0001-91")).toBe(false);
    });

    it("rejects a wrong second check digit", () => {
        expect(isValidCnpj("12.ABC.345/01DE-36")).toBe(false);
        expect(isValidCnpj("11.222.333/0001-82")).toBe(false);
    });

    it("rejects a changed letter in the base", () => {
        expect(isValidCnpj("12.ABD.345/01DE-35")).toBe(false);
    });

    it.each(["00.000.000/0000-00", "11111111111111", "99999999999999"])(
        "rejects the repeated characters %s",
        (cnpj) => {
            expect(isValidCnpj(cnpj)).toBe(false);
        },
    );

    it.each([
        "1122233300018",
        "112223330001811",
        "11.222.333-0001/81",
        "12.ABC.345/01DE-3A",
        "12.ABC.345/01DE-A5",
        "12.AB*.345/01DE-35",
        " 11.222.333/0001-81",
        "",
    ])("rejects the malformed value %j", (cnpj) => {
        expect(isValidCnpj(cnpj)).toBe(false);
    });

    it("rejects values that are not strings", () => {
        expect(isValidCnpj(11222333000181)).toBe(false);
        expect(isValidCnpj(undefined)).toBe(false);
        expect(isValidCnpj(null)).toBe(false);
    });
});
