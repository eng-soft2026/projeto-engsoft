import { describe, expect, it } from "vitest";
import {
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
} from "../../src/constants/pagination.js";
import { ValidationError } from "../../src/lib/errors.js";
import { parseWithSchema } from "../../src/lib/validation.js";
import { paginationQuerySchema } from "../../src/schemas/pagination.js";

describe("paginationQuerySchema", () => {
    it("uses the default page and page size for an empty query", () => {
        expect(parseWithSchema(paginationQuerySchema, {})).toEqual({
            page: 1,
            pageSize: DEFAULT_PAGE_SIZE,
        });
    });

    it("converts page and pageSize strings to numbers", () => {
        expect(
            parseWithSchema(paginationQuerySchema, {
                page: "2",
                pageSize: "10",
            }),
        ).toEqual({ page: 2, pageSize: 10 });
    });

    it("accepts the maximum page size", () => {
        expect(
            parseWithSchema(paginationQuerySchema, {
                pageSize: String(MAX_PAGE_SIZE),
            }),
        ).toEqual({ page: 1, pageSize: MAX_PAGE_SIZE });
    });

    it("accepts a page with the largest safe offset at the maximum page size", () => {
        const page = Math.floor(Number.MAX_SAFE_INTEGER / MAX_PAGE_SIZE) + 1;

        expect(
            parseWithSchema(paginationQuerySchema, {
                page: String(page),
                pageSize: String(MAX_PAGE_SIZE),
            }),
        ).toEqual({ page, pageSize: MAX_PAGE_SIZE });
    });

    it("rejects a page whose offset exceeds the safe integer limit", () => {
        const page = Math.floor(Number.MAX_SAFE_INTEGER / MAX_PAGE_SIZE) + 2;

        expect(() =>
            parseWithSchema(paginationQuerySchema, {
                page: String(page),
                pageSize: String(MAX_PAGE_SIZE),
            }),
        ).toThrow(ValidationError);
    });

    it("rejects a page size above the maximum", () => {
        expect(() =>
            parseWithSchema(paginationQuerySchema, {
                pageSize: String(MAX_PAGE_SIZE + 1),
            }),
        ).toThrow(ValidationError);
    });

    it.each(["0", "-1", "1.5", "abc", ""])(
        "rejects invalid page %j",
        (page) => {
            expect(() =>
                parseWithSchema(paginationQuerySchema, { page }),
            ).toThrow(ValidationError);
        },
    );

    it.each(["0", "-5", "2.5", "abc", ""])(
        "rejects invalid pageSize %j",
        (pageSize) => {
            expect(() =>
                parseWithSchema(paginationQuerySchema, { pageSize }),
            ).toThrow(ValidationError);
        },
    );

    it("ignores unknown query parameters", () => {
        expect(
            parseWithSchema(paginationQuerySchema, {
                page: "2",
                pageSize: "10",
                sort: "name",
            }),
        ).toEqual({ page: 2, pageSize: 10 });
    });
});
