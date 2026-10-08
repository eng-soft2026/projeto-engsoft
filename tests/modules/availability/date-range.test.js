import { describe, expect, it } from "vitest";
import { hasDateConflict } from "../../../src/modules/availability/date-range.js";

const range = (checkIn, checkOut) => ({
    checkIn: new Date(checkIn),
    checkOut: new Date(checkOut),
});

describe("hasDateConflict (RN037)", () => {
    it("allows back-to-back stays", () => {
        const first = range("2026-10-10", "2026-10-12");
        const second = range("2026-10-12", "2026-10-15");

        expect(hasDateConflict(first, second)).toBe(false);
        expect(hasDateConflict(second, first)).toBe(false);
    });

    it("detects partially overlapping stays", () => {
        const first = range("2026-10-10", "2026-10-13");
        const second = range("2026-10-12", "2026-10-15");

        expect(hasDateConflict(first, second)).toBe(true);
        expect(hasDateConflict(second, first)).toBe(true);
    });

    it("detects a stay contained in another", () => {
        const outer = range("2026-10-10", "2026-10-20");
        const inner = range("2026-10-12", "2026-10-14");

        expect(hasDateConflict(outer, inner)).toBe(true);
    });

    it("detects identical stays", () => {
        const stay = range("2026-10-10", "2026-10-12");

        expect(hasDateConflict(stay, stay)).toBe(true);
    });

    it("allows stays far apart", () => {
        const first = range("2026-10-10", "2026-10-12");
        const second = range("2026-11-01", "2026-11-03");

        expect(hasDateConflict(first, second)).toBe(false);
    });
});