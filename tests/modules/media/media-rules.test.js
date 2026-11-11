import { describe, expect, it } from "vitest";
import { getMediaLimits } from "../../../src/config/media.js";
import { MEDIA_KINDS } from "../../../src/constants/media.js";
import {
    buildMediaPublicId,
    resolveFileExtension,
    validateMediaFile,
    validateStoredImage,
} from "../../../src/modules/media/media-rules.js";

const LIMITS = getMediaLimits({});
const IMAGE_ONLY = { allowedKinds: [MEDIA_KINDS.IMAGE], limits: LIMITS };
const IMAGE_AND_VIDEO = {
    allowedKinds: [MEDIA_KINDS.IMAGE, MEDIA_KINDS.VIDEO],
    limits: LIMITS,
};

function buildFile(overrides = {}) {
    return {
        fileName: "fachada.jpg",
        mimeType: "image/jpeg",
        bytes: 1024,
        ...overrides,
    };
}

describe("resolveFileExtension", () => {
    it.each([
        ["foto.JPG", "jpg"],
        ["foto.final.jpeg", "jpeg"],
        ["semextensao", null],
        [".jpg", null],
        ["foto.", null],
    ])("resolves %j to %j", (fileName, expected) => {
        expect(resolveFileExtension(fileName)).toBe(expected);
    });
});

describe("validateMediaFile", () => {
    it("accepts a JPG image up to the image limit", () => {
        const file = validateMediaFile(
            buildFile({ bytes: LIMITS.maxImageBytes }),
            IMAGE_ONLY,
        );

        expect(file).toMatchObject({
            kind: "IMAGE",
            extension: "jpg",
            resourceType: "image",
            allowedFormats: ["jpg", "jpeg"],
            maxBytes: LIMITS.maxImageBytes,
        });
    });

    it("refuses an image one byte above the limit", () => {
        expect(() =>
            validateMediaFile(
                buildFile({ bytes: LIMITS.maxImageBytes + 1 }),
                IMAGE_ONLY,
            ),
        ).toThrow(
            expect.objectContaining({
                code: "MEDIA_TOO_LARGE",
                message: "A imagem deve ter no máximo 10 MB.",
            }),
        );
    });

    it.each([
        ["a PNG", { fileName: "foto.png", mimeType: "image/png" }],
        ["an extension that does not match the MIME", { fileName: "foto.mp4" }],
        ["a file without extension", { fileName: "foto" }],
        [
            "a video where only images are accepted",
            { fileName: "tour.mp4", mimeType: "video/mp4" },
        ],
    ])("refuses %s with INVALID_MEDIA_TYPE", (_, overrides) => {
        expect(() =>
            validateMediaFile(buildFile(overrides), IMAGE_ONLY),
        ).toThrow(expect.objectContaining({ code: "INVALID_MEDIA_TYPE" }));
    });

    it.each([
        ["tour.mp4", "video/mp4"],
        ["tour.webm", "video/webm"],
        ["tour.MOV", "video/quicktime"],
    ])("accepts the video %s up to 10 seconds", (fileName, mimeType) => {
        const file = validateMediaFile(
            buildFile({ fileName, mimeType, durationSeconds: 10 }),
            IMAGE_AND_VIDEO,
        );

        expect(file).toMatchObject({
            kind: "VIDEO",
            resourceType: "video",
            allowedFormats: ["mp4", "webm", "mov"],
        });
    });

    it("refuses a video longer than 10 seconds", () => {
        expect(() =>
            validateMediaFile(
                buildFile({
                    fileName: "tour.mp4",
                    mimeType: "video/mp4",
                    durationSeconds: 10.5,
                }),
                IMAGE_AND_VIDEO,
            ),
        ).toThrow(expect.objectContaining({ code: "VIDEO_TOO_LONG" }));
    });

    it("requires the duration of a video", () => {
        expect(() =>
            validateMediaFile(
                buildFile({ fileName: "tour.mp4", mimeType: "video/mp4" }),
                IMAGE_AND_VIDEO,
            ),
        ).toThrow(expect.objectContaining({ code: "VALIDATION_ERROR" }));
    });

    it("refuses a video above the video limit", () => {
        expect(() =>
            validateMediaFile(
                buildFile({
                    fileName: "tour.mp4",
                    mimeType: "video/mp4",
                    durationSeconds: 5,
                    bytes: LIMITS.maxVideoBytes + 1,
                }),
                IMAGE_AND_VIDEO,
            ),
        ).toThrow(
            expect.objectContaining({
                code: "MEDIA_TOO_LARGE",
                message: "O vídeo deve ter no máximo 50 MB.",
            }),
        );
    });
});

describe("buildMediaPublicId", () => {
    it("builds the doc 22 folders", () => {
        expect(buildMediaPublicId("HOTEL", "h1", "a1")).toBe("hotels/h1/a1");
        expect(buildMediaPublicId("UNIT", "u1", "a1")).toBe("units/u1/a1");
        expect(buildMediaPublicId("ROOM_TYPE", "t1", "a1")).toBe(
            "room-types/t1/a1",
        );
    });
});

describe("validateStoredImage", () => {
    const stored = { format: "JPG", bytes: 1024, width: 10, height: 10 };

    it("accepts a JPG within the limit and normalizes the format", () => {
        expect(validateStoredImage(stored, LIMITS)).toBe("jpg");
        expect(validateStoredImage({ ...stored, format: "jpeg" }, LIMITS)).toBe(
            "jpeg",
        );
    });

    it("refuses another real format", () => {
        expect(() =>
            validateStoredImage({ ...stored, format: "png" }, LIMITS),
        ).toThrow(expect.objectContaining({ code: "INVALID_MEDIA_TYPE" }));
        expect(() =>
            validateStoredImage({ ...stored, format: undefined }, LIMITS),
        ).toThrow(expect.objectContaining({ code: "INVALID_MEDIA_TYPE" }));
    });

    it("refuses a real size above the image limit", () => {
        expect(() =>
            validateStoredImage(
                { ...stored, bytes: LIMITS.maxImageBytes + 1 },
                LIMITS,
            ),
        ).toThrow(expect.objectContaining({ code: "MEDIA_TOO_LARGE" }));
    });
});
