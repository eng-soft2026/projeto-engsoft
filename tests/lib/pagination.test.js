import { describe, expect, it } from "vitest";
import { buildPageMeta, getSkipTake } from "../../src/lib/pagination.js";

describe("getSkipTake", () => {
    it.each([
        [
            { page: 1, pageSize: 20 },
            { skip: 0, take: 20 },
        ],
        [
            { page: 3, pageSize: 20 },
            { skip: 40, take: 20 },
        ],
        [
            { page: 5, pageSize: 1 },
            { skip: 4, take: 1 },
        ],
    ])("returns the database range for %j", (pagination, expected) => {
        expect(getSkipTake(pagination)).toEqual(expected);
    });

    it("accepts the largest safe offset", () => {
        const page = Math.floor(Number.MAX_SAFE_INTEGER / 100) + 1;

        expect(getSkipTake({ page, pageSize: 100 })).toEqual({
            skip: (page - 1) * 100,
            take: 100,
        });
    });

    it("throws when the offset exceeds the safe integer limit", () => {
        const page = Math.floor(Number.MAX_SAFE_INTEGER / 100) + 2;

        expect(() => getSkipTake({ page, pageSize: 100 })).toThrow(RangeError);
    });

    it("preserves the default first-page range", () => {
        expect(getSkipTake({ page: 1, pageSize: 20 })).toEqual({
            skip: 0,
            take: 20,
        });
    });
});

describe("buildPageMeta", () => {
    it("returns the page metadata", () => {
        expect(buildPageMeta({ page: 2, pageSize: 10, total: 25 })).toEqual({
            page: 2,
            pageSize: 10,
            total: 25,
        });
    });

    it("includes a total of zero", () => {
        expect(buildPageMeta({ page: 1, pageSize: 20, total: 0 })).toEqual({
            page: 1,
            pageSize: 20,
            total: 0,
        });
    });
});
