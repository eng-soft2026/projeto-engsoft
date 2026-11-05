import { describe, expect, it } from "vitest";
import { getRequestContext } from "../../src/lib/request-context.js";
import { runWithRequestStore } from "../../src/lib/request-store.js";

function createRequest(headers) {
    return new Request("http://localhost/api/admin/hotels", { headers });
}

describe("getRequestContext", () => {
    it("reads the request id, the client address and the user agent", () => {
        const request = createRequest({
            "x-request-id": "req-123",
            "x-forwarded-for": "203.0.113.7",
            "user-agent": "Mozilla/5.0",
        });

        expect(getRequestContext(request)).toEqual({
            requestId: "req-123",
            ipAddress: "203.0.113.7",
            userAgent: "Mozilla/5.0",
        });
    });

    it("uses the first address of x-forwarded-for", () => {
        const request = createRequest({
            "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2",
        });

        expect(getRequestContext(request).ipAddress).toBe("203.0.113.7");
    });

    it("falls back to x-real-ip without x-forwarded-for", () => {
        const request = createRequest({ "x-real-ip": "198.51.100.4" });

        expect(getRequestContext(request).ipAddress).toBe("198.51.100.4");
    });

    it("falls back to x-real-ip when x-forwarded-for is blank", () => {
        const request = createRequest({
            "x-forwarded-for": " ",
            "x-real-ip": "198.51.100.4",
        });

        expect(getRequestContext(request).ipAddress).toBe("198.51.100.4");
    });

    it("returns nulls when the headers are absent", () => {
        const request = new Request("http://localhost/api/admin/hotels");

        expect(getRequestContext(request)).toEqual({
            requestId: null,
            ipAddress: null,
            userAgent: null,
        });
    });

    it("prefers the request id of the current request store", () => {
        const request = createRequest({ "x-request-id": "bad id with spaces" });

        const context = runWithRequestStore({ requestId: "req-store" }, () =>
            getRequestContext(request),
        );

        expect(context.requestId).toBe("req-store");
    });
});
