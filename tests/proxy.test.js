import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "../src/proxy.js";

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const FORWARDED_REQUEST_ID_HEADER = "x-middleware-request-x-request-id";

function createRequest(path, headers = {}) {
    return new NextRequest(`http://localhost${path}`, { headers });
}

function matchesProxy(path) {
    return config.matcher.some((pattern) =>
        new RegExp(`^${pattern}$`).test(path),
    );
}

describe("proxy", () => {
    it("generates a request id and sends it upstream and in the response", () => {
        const response = proxy(createRequest("/api/hotels"));

        const requestId = response.headers.get("x-request-id");
        expect(requestId).toMatch(UUID_PATTERN);
        expect(response.headers.get(FORWARDED_REQUEST_ID_HEADER)).toBe(
            requestId,
        );
    });

    it("keeps a valid incoming request id", () => {
        const response = proxy(
            createRequest("/hotels", { "x-request-id": "req-1" }),
        );

        expect(response.headers.get("x-request-id")).toBe("req-1");
        expect(response.headers.get(FORWARDED_REQUEST_ID_HEADER)).toBe("req-1");
    });

    it("replaces an invalid incoming request id", () => {
        const response = proxy(
            createRequest("/api/hotels", { "x-request-id": "a".repeat(65) }),
        );

        expect(response.headers.get("x-request-id")).toMatch(UUID_PATTERN);
    });

    it.each(["/", "/api/hotels", "/api/hotels/123/units", "/login"])(
        "runs on %s",
        (path) => {
            expect(matchesProxy(path)).toBe(true);
        },
    );

    it.each(["/_next/static/chunks/main.js", "/_next/image", "/favicon.ico"])(
        "skips the static asset %s",
        (path) => {
            expect(matchesProxy(path)).toBe(false);
        },
    );
});
