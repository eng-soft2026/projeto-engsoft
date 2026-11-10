import { describe, expect, it } from "vitest";
import {
    ADMIN_AREA_NAVIGATION,
    ADMIN_AREA_PATH,
    ADMIN_NAVIGATION_LINKS,
    CUSTOMER_NAVIGATION_LINKS,
    GUEST_NAVIGATION_LINKS,
    MANAGER_AREA_NAVIGATION,
    MANAGER_AREA_PATH,
    MANAGER_NAVIGATION_LINKS,
    getNavigationItems,
    isNavigationItemActive,
} from "../../../src/components/layout/navigation-links.js";

function collectHrefs(items) {
    return items.map((item) => item.href);
}

function isUnderPath(href, path) {
    return href === path || href.startsWith(`${path}/`);
}

describe("getNavigationItems", () => {
    it("returns the guest links without a role", () => {
        expect(getNavigationItems(undefined)).toBe(GUEST_NAVIGATION_LINKS);
        expect(getNavigationItems(null)).toBe(GUEST_NAVIGATION_LINKS);
        expect(collectHrefs(GUEST_NAVIGATION_LINKS)).toEqual([
            "/login",
            "/register",
        ]);
    });

    it("returns the guest links for an unknown role", () => {
        expect(getNavigationItems("OWNER")).toBe(GUEST_NAVIGATION_LINKS);
    });

    it("returns the customer links", () => {
        expect(getNavigationItems("CUSTOMER")).toBe(CUSTOMER_NAVIGATION_LINKS);
        expect(collectHrefs(CUSTOMER_NAVIGATION_LINKS)).toEqual([
            "/reservations",
            "/favorites",
            "/notifications",
            "/profile",
        ]);
    });

    it("returns the manager links", () => {
        expect(getNavigationItems("MANAGER")).toBe(MANAGER_NAVIGATION_LINKS);
        expect(collectHrefs(MANAGER_NAVIGATION_LINKS)).toEqual([
            "/manager",
            "/notifications",
            "/profile",
        ]);
    });

    it("returns the admin links", () => {
        expect(getNavigationItems("ADMIN")).toBe(ADMIN_NAVIGATION_LINKS);
        expect(collectHrefs(ADMIN_NAVIGATION_LINKS)).toEqual([
            "/admin",
            "/notifications",
            "/profile",
        ]);
    });

    it.each(["CUSTOMER", "MANAGER", undefined])(
        "never shows an admin route to %s",
        (role) => {
            const hrefs = collectHrefs(getNavigationItems(role));

            expect(
                hrefs.some((href) => isUnderPath(href, ADMIN_AREA_PATH)),
            ).toBe(false);
        },
    );

    it.each(["CUSTOMER", "ADMIN", undefined])(
        "never shows a manager route to %s",
        (role) => {
            const hrefs = collectHrefs(getNavigationItems(role));

            expect(
                hrefs.some((href) => isUnderPath(href, MANAGER_AREA_PATH)),
            ).toBe(false);
        },
    );

    it("keeps every area item inside its area", () => {
        expect(
            collectHrefs(MANAGER_AREA_NAVIGATION).every((href) =>
                isUnderPath(href, MANAGER_AREA_PATH),
            ),
        ).toBe(true);
        expect(
            collectHrefs(ADMIN_AREA_NAVIGATION).every((href) =>
                isUnderPath(href, ADMIN_AREA_PATH),
            ),
        ).toBe(true);
    });

    it("has unique hrefs in every menu", () => {
        const menus = [
            GUEST_NAVIGATION_LINKS,
            CUSTOMER_NAVIGATION_LINKS,
            MANAGER_NAVIGATION_LINKS,
            ADMIN_NAVIGATION_LINKS,
            MANAGER_AREA_NAVIGATION,
            ADMIN_AREA_NAVIGATION,
        ];

        for (const menu of menus) {
            const hrefs = collectHrefs(menu);
            expect(new Set(hrefs).size).toBe(hrefs.length);
        }
    });
});

describe("isNavigationItemActive", () => {
    const areaRoot = { href: "/manager", label: "Painel", isExact: true };
    const hotels = { href: "/manager/hotels", label: "Meus hotéis" };

    it("matches the area root only on its exact path", () => {
        expect(isNavigationItemActive(areaRoot, "/manager")).toBe(true);
        expect(isNavigationItemActive(areaRoot, "/manager/hotels")).toBe(false);
    });

    it("matches an item on its path and on its sub-paths", () => {
        expect(isNavigationItemActive(hotels, "/manager/hotels")).toBe(true);
        expect(isNavigationItemActive(hotels, "/manager/hotels/abc")).toBe(
            true,
        );
    });

    it("does not match a path that only shares the prefix", () => {
        expect(isNavigationItemActive(hotels, "/manager/hotels-old")).toBe(
            false,
        );
    });

    it("does not match without a pathname", () => {
        expect(isNavigationItemActive(hotels, null)).toBe(false);
    });
});
