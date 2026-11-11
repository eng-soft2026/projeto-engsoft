import { describe, expect, it } from "vitest";
import {
    DEFAULT_NOMINATIM_BASE_URL,
    getNominatimConfig,
    isNominatimConfigured,
} from "../../src/config/nominatim.js";

describe("getNominatimConfig", () => {
    it("uses the public Nominatim URL and no user agent by default", () => {
        const config = getNominatimConfig({});

        expect(config).toEqual({
            baseUrl: DEFAULT_NOMINATIM_BASE_URL,
            userAgent: "",
        });
        expect(isNominatimConfigured(config)).toBe(false);
    });

    it("reads the trimmed values and drops a trailing slash", () => {
        const config = getNominatimConfig({
            NOMINATIM_BASE_URL: " https://geo.example.com/ ",
            NOMINATIM_USER_AGENT: " projeto-hotel/1.0 ",
        });

        expect(config).toEqual({
            baseUrl: "https://geo.example.com",
            userAgent: "projeto-hotel/1.0",
        });
        expect(isNominatimConfigured(config)).toBe(true);
    });

    it("falls back to the default URL when the variable is blank", () => {
        const config = getNominatimConfig({ NOMINATIM_BASE_URL: "  " });

        expect(config.baseUrl).toBe(DEFAULT_NOMINATIM_BASE_URL);
    });
});
