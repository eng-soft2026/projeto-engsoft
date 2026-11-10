import { afterEach, describe, expect, it, vi } from "vitest";
import {
    ApiError,
    CLIENT_ERROR_CODES,
    createApiClient,
    redirectToLogin,
} from "../../src/lib/api-client.js";
import { ERROR_CODES } from "../../src/lib/errors.js";

function createJsonResponse(payload, status = 200) {
    return Response.json(payload, { status });
}

function createClient(response) {
    const fetchImpl = vi.fn().mockResolvedValue(response);
    const onUnauthorized = vi.fn();
    const apiFetch = createApiClient({ fetchImpl, onUnauthorized });
    return { apiFetch, fetchImpl, onUnauthorized };
}

async function captureError(promise) {
    try {
        await promise;
    } catch (error) {
        return error;
    }
    throw new Error("Expected the promise to reject");
}

describe("apiFetch", () => {
    it("returns the data of a success envelope", async () => {
        const { apiFetch } = createClient(
            createJsonResponse({ success: true, data: { id: "hotel-1" } }),
        );

        await expect(apiFetch("/api/hotels/hotel-1")).resolves.toEqual({
            id: "hotel-1",
        });
    });

    it("sends a same-origin GET without a body by default", async () => {
        const { apiFetch, fetchImpl } = createClient(
            createJsonResponse({ success: true, data: null }),
        );

        await apiFetch("/api/users/me");

        expect(fetchImpl).toHaveBeenCalledWith("/api/users/me", {
            method: "GET",
            headers: { Accept: "application/json" },
            credentials: "same-origin",
            signal: undefined,
        });
    });

    it("sends the body as JSON", async () => {
        const { apiFetch, fetchImpl } = createClient(
            createJsonResponse({ success: true, data: null }, 201),
        );
        const signal = new AbortController().signal;

        await apiFetch("/api/hotels", {
            method: "POST",
            body: { name: "Hotel Sol" },
            signal,
        });

        expect(fetchImpl).toHaveBeenCalledWith("/api/hotels", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            credentials: "same-origin",
            signal,
            body: '{"name":"Hotel Sol"}',
        });
    });

    it.each([
        "https://evil.example/api",
        "//evil.example/api",
        "/\\evil.example/api",
        "api/hotels",
        undefined,
    ])("refuses the path %s", async (path) => {
        const { apiFetch, fetchImpl } = createClient(
            createJsonResponse({ success: true, data: null }),
        );

        await expect(apiFetch(path)).rejects.toThrow(TypeError);
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    it("throws an ApiError with the code, message and status of the envelope", async () => {
        const { apiFetch, onUnauthorized } = createClient(
            createJsonResponse(
                {
                    success: false,
                    error: {
                        code: ERROR_CODES.HOTEL_NOT_FOUND,
                        message: "Hotel não encontrado.",
                    },
                },
                404,
            ),
        );

        const error = await captureError(apiFetch("/api/hotels/missing"));

        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({
            code: ERROR_CODES.HOTEL_NOT_FOUND,
            message: "Hotel não encontrado.",
            status: 404,
        });
        expect(onUnauthorized).not.toHaveBeenCalled();
    });

    it("throws NETWORK_ERROR with status 0 when the request fails", async () => {
        const fetchImpl = vi
            .fn()
            .mockRejectedValue(new TypeError("Failed to fetch"));
        const apiFetch = createApiClient({
            fetchImpl,
            onUnauthorized: vi.fn(),
        });

        const error = await captureError(apiFetch("/api/hotels"));

        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({
            code: CLIENT_ERROR_CODES.NETWORK_ERROR,
            message: "",
            status: 0,
        });
    });

    it("rethrows an aborted request unchanged", async () => {
        const abortError = new DOMException("Aborted", "AbortError");
        const fetchImpl = vi.fn().mockRejectedValue(abortError);
        const apiFetch = createApiClient({
            fetchImpl,
            onUnauthorized: vi.fn(),
        });

        await expect(apiFetch("/api/hotels")).rejects.toBe(abortError);
    });

    it("throws INTERNAL_ERROR with the real status when the body is not an envelope", async () => {
        const { apiFetch } = createClient(
            new Response("<html>Bad Gateway</html>", { status: 502 }),
        );

        const error = await captureError(apiFetch("/api/hotels"));

        expect(error).toMatchObject({
            code: ERROR_CODES.INTERNAL_ERROR,
            message: "",
            status: 502,
        });
    });

    it("throws INTERNAL_ERROR when a 2xx answer is not a success envelope", async () => {
        const { apiFetch } = createClient(createJsonResponse({ id: "x" }));

        const error = await captureError(apiFetch("/api/hotels"));

        expect(error).toMatchObject({
            code: ERROR_CODES.INTERNAL_ERROR,
            status: 200,
        });
    });

    it("calls onUnauthorized and throws when the session is missing", async () => {
        const { apiFetch, onUnauthorized } = createClient(
            createJsonResponse(
                {
                    success: false,
                    error: {
                        code: ERROR_CODES.UNAUTHORIZED,
                        message: "Autenticação necessária.",
                    },
                },
                401,
            ),
        );

        const error = await captureError(apiFetch("/api/users/me"));

        expect(error).toMatchObject({
            code: ERROR_CODES.UNAUTHORIZED,
            status: 401,
        });
        expect(onUnauthorized).toHaveBeenCalledOnce();
    });

    it("does not redirect on INVALID_CREDENTIALS", async () => {
        const { apiFetch, onUnauthorized } = createClient(
            createJsonResponse(
                {
                    success: false,
                    error: {
                        code: ERROR_CODES.INVALID_CREDENTIALS,
                        message: "E-mail ou senha inválidos.",
                    },
                },
                401,
            ),
        );

        const error = await captureError(apiFetch("/api/auth/login"));

        expect(error.code).toBe(ERROR_CODES.INVALID_CREDENTIALS);
        expect(onUnauthorized).not.toHaveBeenCalled();
    });

    it("uses the global fetch by default", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValue(createJsonResponse({ success: true, data: 1 }));
        vi.stubGlobal("fetch", fetchMock);

        await expect(createApiClient()("/api/health")).resolves.toBe(1);
        expect(fetchMock).toHaveBeenCalledOnce();

        vi.unstubAllGlobals();
    });
});

describe("redirectToLogin", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    function stubLocation(pathname, search = "") {
        const location = { pathname, search, assign: vi.fn() };
        vi.stubGlobal("window", { location });
        return location;
    }

    it("sends the user to /login with the current page as callbackUrl", () => {
        const location = stubLocation("/hotels/hotel-1", "?tab=units");

        redirectToLogin();

        expect(location.assign).toHaveBeenCalledWith(
            "/login?callbackUrl=%2Fhotels%2Fhotel-1%3Ftab%3Dunits",
        );
    });

    it("stays put when the user is already on /login", () => {
        const location = stubLocation("/login");

        redirectToLogin();

        expect(location.assign).not.toHaveBeenCalled();
    });
});
