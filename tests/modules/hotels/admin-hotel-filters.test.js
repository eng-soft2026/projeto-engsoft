import { describe, expect, it } from "vitest";
import { HOTEL_STATUSES } from "../../../src/constants/hotel-statuses.js";
import {
    ADMIN_HOTEL_STATUS_FILTERS,
    ALL_STATUSES_FILTER,
    buildAdminHotelsHref,
    readAdminHotelsQuery,
} from "../../../src/modules/hotels/admin-hotel-filters.js";

const DEFAULT_PAGE_SIZE = 20;

describe("admin hotel filters", () => {
    it("offers every hotel status plus all, starting with under review", () => {
        expect(ADMIN_HOTEL_STATUS_FILTERS.map(({ value }) => value)).toEqual([
            HOTEL_STATUSES.UNDER_REVIEW,
            HOTEL_STATUSES.PUBLISHED,
            HOTEL_STATUSES.BLOCKED,
            HOTEL_STATUSES.DRAFT,
            ALL_STATUSES_FILTER,
        ]);
    });

    it.each(Object.values(HOTEL_STATUSES))(
        "sends the %s status to the query",
        (status) => {
            expect(readAdminHotelsQuery({ status, page: "3" })).toEqual({
                filter: status,
                status,
                page: 3,
                pageSize: DEFAULT_PAGE_SIZE,
            });
        },
    );

    it("sends no status when the filter is all", () => {
        expect(readAdminHotelsQuery({ status: ALL_STATUSES_FILTER })).toEqual({
            filter: ALL_STATUSES_FILTER,
            status: undefined,
            page: 1,
            pageSize: DEFAULT_PAGE_SIZE,
        });
    });

    it.each([
        {},
        undefined,
        { status: "ARCHIVED" },
        { status: "under_review" },
        { status: ["PUBLISHED", "BLOCKED"] },
    ])("falls back to under review for %j", (searchParams) => {
        expect(readAdminHotelsQuery(searchParams)).toMatchObject({
            filter: HOTEL_STATUSES.UNDER_REVIEW,
            status: HOTEL_STATUSES.UNDER_REVIEW,
        });
    });

    it.each(["abc", "0", "-1", "1.5"])(
        "falls back to the first page for page %s",
        (page) => {
            expect(readAdminHotelsQuery({ page })).toMatchObject({
                page: 1,
                pageSize: DEFAULT_PAGE_SIZE,
            });
        },
    );

    it("builds the list link with the filter and only pages after the first", () => {
        expect(buildAdminHotelsHref({ filter: HOTEL_STATUSES.BLOCKED })).toBe(
            "/admin/hotels?status=BLOCKED",
        );
        expect(
            buildAdminHotelsHref({ filter: ALL_STATUSES_FILTER, page: 1 }),
        ).toBe("/admin/hotels?status=ALL");
        expect(
            buildAdminHotelsHref({
                filter: HOTEL_STATUSES.UNDER_REVIEW,
                page: 2,
            }),
        ).toBe("/admin/hotels?status=UNDER_REVIEW&page=2");
    });
});
