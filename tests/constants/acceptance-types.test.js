import { describe, expect, it } from "vitest";
import {
    ACCEPTANCE_TYPE_CODES,
    SYSTEM_ACCEPTANCE_TYPES,
} from "../../src/constants/acceptance-types.js";

describe("SYSTEM_ACCEPTANCE_TYPES", () => {
    it("lists the six platform acceptance types", () => {
        const codes = SYSTEM_ACCEPTANCE_TYPES.map(({ code }) => code);

        expect(codes).toEqual([
            "PETS",
            "SMOKING",
            "CHILDREN",
            "VISITORS",
            "EVENTS",
            "OTHER",
        ]);
    });

    it("covers every acceptance type code exactly once", () => {
        const codes = SYSTEM_ACCEPTANCE_TYPES.map(({ code }) => code);

        expect(new Set(codes).size).toBe(codes.length);
        expect([...codes].sort()).toEqual(
            Object.values(ACCEPTANCE_TYPE_CODES).sort(),
        );
    });

    it("gives every type a name and a description", () => {
        for (const acceptanceType of SYSTEM_ACCEPTANCE_TYPES) {
            expect(acceptanceType.name.trim()).not.toBe("");
            expect(acceptanceType.description.trim()).not.toBe("");
        }
    });

    it("cannot be changed at runtime", () => {
        expect(Object.isFrozen(SYSTEM_ACCEPTANCE_TYPES)).toBe(true);
        expect(Object.isFrozen(SYSTEM_ACCEPTANCE_TYPES[0])).toBe(true);
    });
});
