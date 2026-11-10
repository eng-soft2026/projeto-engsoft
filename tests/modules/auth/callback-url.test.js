import { describe, expect, it } from "vitest";
import {
    DEFAULT_CALLBACK_URL,
    buildAuthPageHref,
    resolveCallbackUrl,
} from "../../../src/modules/auth/callback-url.js";

describe("resolveCallbackUrl", () => {
    it.each(["/", "/reservations", "/hotels/abc?checkIn=2026-12-01#rooms"])(
        "keeps the same-origin path %s",
        (path) => {
            expect(resolveCallbackUrl(path)).toBe(path);
        },
    );

    it.each([
        undefined,
        null,
        "",
        ["/reservations"],
        "reservations",
        "https://evil.example.com",
        "//evil.example.com",
        "/\\evil.example.com",
        "/path with spaces",
        "javascript:alert(1)",
    ])("falls back to the home for the unsafe value %j", (value) => {
        expect(resolveCallbackUrl(value)).toBe(DEFAULT_CALLBACK_URL);
    });

    it.each(["/login", "/login/", "/register?callbackUrl=%2F", "/login#form"])(
        "falls back to the home for the auth page %s",
        (path) => {
            expect(resolveCallbackUrl(path)).toBe(DEFAULT_CALLBACK_URL);
        },
    );

    it("keeps a path that only starts with an auth page name", () => {
        expect(resolveCallbackUrl("/login-help")).toBe("/login-help");
    });
});

describe("buildAuthPageHref", () => {
    it("adds the encoded callback URL", () => {
        expect(buildAuthPageHref("/login", "/hotels/abc?page=2")).toBe(
            "/login?callbackUrl=%2Fhotels%2Fabc%3Fpage%3D2",
        );
    });

    it("omits the callback URL when it is the home or unsafe", () => {
        expect(buildAuthPageHref("/login", "/")).toBe("/login");
        expect(buildAuthPageHref("/register", "//evil.example.com")).toBe(
            "/register",
        );
    });
});
