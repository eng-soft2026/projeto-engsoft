import { describe, expect, it } from "vitest";
import {
    BYTES_PER_MEGABYTE,
    DEFAULT_MEDIA_LIMITS,
    getMediaLimits,
} from "../../src/config/media.js";
import {
    getCloudinaryConfig,
    isCloudinaryConfigured,
} from "../../src/config/cloudinary.js";

describe("getMediaLimits", () => {
    it("uses the doc 22 defaults when nothing is configured", () => {
        const limits = getMediaLimits({});

        expect(limits).toMatchObject(DEFAULT_MEDIA_LIMITS);
        expect(limits.maxImageBytes).toBe(10 * BYTES_PER_MEGABYTE);
        expect(limits.maxVideoBytes).toBe(50 * BYTES_PER_MEGABYTE);
        expect(limits.maxReviewVideoSeconds).toBe(10);
    });

    it("reads lower configured values", () => {
        const limits = getMediaLimits({
            MAX_IMAGE_UPLOAD_MB: "5",
            MAX_VIDEO_UPLOAD_MB: "20",
            MAX_REVIEW_VIDEO_SECONDS: "8",
        });

        expect(limits.maxImageBytes).toBe(5 * BYTES_PER_MEGABYTE);
        expect(limits.maxVideoBytes).toBe(20 * BYTES_PER_MEGABYTE);
        expect(limits.maxReviewVideoSeconds).toBe(8);
    });

    it("never goes above the domain ceilings", () => {
        const limits = getMediaLimits({
            MAX_IMAGE_UPLOAD_MB: "80",
            MAX_VIDEO_UPLOAD_MB: "200",
            MAX_REVIEW_VIDEO_SECONDS: "60",
        });

        expect(limits.maxImageUploadMb).toBe(50);
        expect(limits.maxVideoUploadMb).toBe(50);
        expect(limits.maxReviewVideoSeconds).toBe(10);
    });

    it.each(["", "0", "-3", "2.5", "abc"])(
        "falls back to the default for the invalid value %j",
        (value) => {
            const limits = getMediaLimits({ MAX_IMAGE_UPLOAD_MB: value });

            expect(limits.maxImageUploadMb).toBe(10);
        },
    );
});

describe("getCloudinaryConfig", () => {
    it("reads the three variables and reports when one is missing", () => {
        const config = getCloudinaryConfig({
            CLOUDINARY_CLOUD_NAME: "demo-cloud",
            CLOUDINARY_API_KEY: "chave-publica",
            CLOUDINARY_API_SECRET: "segredo-de-teste",
        });

        expect(config).toEqual({
            cloudName: "demo-cloud",
            apiKey: "chave-publica",
            apiSecret: "segredo-de-teste",
        });
        expect(isCloudinaryConfigured(config)).toBe(true);
        expect(isCloudinaryConfigured(getCloudinaryConfig({}))).toBe(false);
    });
});
