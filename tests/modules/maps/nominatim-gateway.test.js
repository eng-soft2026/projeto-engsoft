import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    NominatimGatewayError,
    buildNominatimSearchParams,
    createNominatimGateway,
} from "../../../src/modules/maps/nominatim-gateway.js";

const ADDRESS = Object.freeze({
    zipCode: "01001000",
    street: "Praça da Sé",
    number: "100",
    complement: "Sala 2",
    neighborhood: "Sé",
    city: "São Paulo",
    state: "SP",
});

const CONFIG = Object.freeze({
    baseUrl: "https://geo.example.com",
    userAgent: "projeto-hotel/1.0",
});

function createJsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
    });
}

describe("buildNominatimSearchParams", () => {
    it("builds a structured Brazilian search without the complement", () => {
        const params = buildNominatimSearchParams(ADDRESS);

        expect(Object.fromEntries(params)).toEqual({
            street: "100 Praça da Sé",
            city: "São Paulo",
            state: "SP",
            postalcode: "01001-000",
            countrycodes: "br",
            format: "jsonv2",
            limit: "1",
            addressdetails: "0",
        });
    });
});

describe("createNominatimGateway", () => {
    let fetchImpl;
    let gateway;

    beforeEach(() => {
        fetchImpl = vi.fn();
        gateway = createNominatimGateway({
            getConfig: () => CONFIG,
            fetchImpl,
        });
    });

    it("calls the search endpoint with the identified user agent", async () => {
        fetchImpl.mockResolvedValue(
            createJsonResponse([{ lat: "-23.5505199", lon: "-46.6333094" }]),
        );

        const result = await gateway.search(ADDRESS);

        expect(result).toEqual({
            latitude: "-23.5505199",
            longitude: "-46.6333094",
        });
        const [url, options] = fetchImpl.mock.calls[0];
        expect(url).toMatch(/^https:\/\/geo\.example\.com\/search\?/);
        expect(new URL(url).searchParams.get("countrycodes")).toBe("br");
        expect(options.headers["User-Agent"]).toBe("projeto-hotel/1.0");
        expect(options.signal).toBeInstanceOf(AbortSignal);
    });

    it("returns null when Nominatim finds nothing", async () => {
        fetchImpl.mockResolvedValue(createJsonResponse([]));

        await expect(gateway.search(ADDRESS)).resolves.toBeNull();
    });

    it("rejects a non-success status", async () => {
        fetchImpl.mockResolvedValue(createJsonResponse({}, 503));

        await expect(gateway.search(ADDRESS)).rejects.toBeInstanceOf(
            NominatimGatewayError,
        );
    });

    it("rejects an unexpected body", async () => {
        fetchImpl.mockResolvedValue(createJsonResponse({ error: "x" }));

        await expect(gateway.search(ADDRESS)).rejects.toBeInstanceOf(
            NominatimGatewayError,
        );
    });

    it("propagates a timeout from fetch", async () => {
        fetchImpl.mockRejectedValue(
            new DOMException("The operation timed out.", "TimeoutError"),
        );

        await expect(gateway.search(ADDRESS)).rejects.toThrow(/timed out/);
    });

    it("refuses to call Nominatim without a user agent", async () => {
        const unconfigured = createNominatimGateway({
            getConfig: () => ({ ...CONFIG, userAgent: "" }),
            fetchImpl,
        });

        await expect(unconfigured.search(ADDRESS)).rejects.toBeInstanceOf(
            NominatimGatewayError,
        );
        expect(fetchImpl).not.toHaveBeenCalled();
    });
});
