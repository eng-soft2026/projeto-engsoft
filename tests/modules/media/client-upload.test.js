import { describe, expect, it } from "vitest";
import { MAX_HOTEL_IMAGES } from "../../../src/constants/media.js";
import {
    ACCEPTED_IMAGE_TYPES,
    INVALID_IMAGE_FORMAT_MESSAGE,
    countRemainingSlots,
    formatImageLimitMessage,
    formatImageTooLargeMessage,
    formatMegabytes,
    selectFilesToUpload,
    validateImageFile,
} from "../../../src/modules/media/client-upload.js";

const MEGABYTE = 1024 * 1024;
const MAX_BYTES = 10 * MEGABYTE;

function buildFile({
    name = "fachada.jpg",
    type = "image/jpeg",
    size = MEGABYTE,
} = {}) {
    return { name, type, size };
}

describe("client upload rules", () => {
    it("accepts only JPEG files in the file picker", () => {
        expect(ACCEPTED_IMAGE_TYPES).toBe("image/jpeg,.jpg,.jpeg");
    });

    it.each(["fachada.jpg", "fachada.JPEG", "quarto.final.jpeg"])(
        "accepts the JPEG file %s",
        (name) => {
            expect(validateImageFile(buildFile({ name }), MAX_BYTES)).toBe(
                null,
            );
        },
    );

    it.each([
        { name: "fachada.png", type: "image/png" },
        { name: "fachada.png", type: "image/jpeg" },
        { name: "fachada", type: "image/jpeg" },
        { name: "fachada.jpg", type: "" },
        { name: "video.mp4", type: "video/mp4" },
    ])("refuses the file $name with type '$type'", (file) => {
        expect(validateImageFile(buildFile(file), MAX_BYTES)).toBe(
            INVALID_IMAGE_FORMAT_MESSAGE,
        );
    });

    it("refuses a file without name or type", () => {
        expect(validateImageFile({ size: MEGABYTE }, MAX_BYTES)).toBe(
            INVALID_IMAGE_FORMAT_MESSAGE,
        );
    });

    it("accepts a file of exactly the size limit", () => {
        expect(
            validateImageFile(buildFile({ size: MAX_BYTES }), MAX_BYTES),
        ).toBe(null);
    });

    it.each([MAX_BYTES + 1, 0])("refuses a file of %i bytes", (size) => {
        expect(validateImageFile(buildFile({ size }), MAX_BYTES)).toBe(
            "A foto deve ter no máximo 10 MB.",
        );
    });

    it("formats the limits in megabytes", () => {
        expect(formatMegabytes(MAX_BYTES)).toBe(10);
        expect(formatImageTooLargeMessage(5 * MEGABYTE)).toBe(
            "A foto deve ter no máximo 5 MB.",
        );
        expect(formatImageLimitMessage(MAX_HOTEL_IMAGES, "do hotel")).toBe(
            "A galeria do hotel aceita no máximo 10 fotos.",
        );
    });

    it("counts the remaining slots of a capped gallery", () => {
        expect(countRemainingSlots(MAX_HOTEL_IMAGES, 3)).toBe(7);
        expect(countRemainingSlots(MAX_HOTEL_IMAGES, 10)).toBe(0);
        expect(countRemainingSlots(MAX_HOTEL_IMAGES, 12)).toBe(0);
    });

    it("never runs out of slots in an uncapped gallery", () => {
        expect(countRemainingSlots(null, 500)).toBe(Number.POSITIVE_INFINITY);
    });

    it("refuses the 11th photo of a hotel", () => {
        const eleventh = buildFile({ name: "decima-primeira.jpg" });

        const result = selectFilesToUpload([eleventh], {
            maxBytes: MAX_BYTES,
            maxImages: MAX_HOTEL_IMAGES,
            usedCount: MAX_HOTEL_IMAGES,
        });

        expect(result).toEqual({
            accepted: [],
            rejected: [],
            hasReachedLimit: true,
        });
    });

    it("accepts files up to the remaining slots and flags the rest", () => {
        const files = [
            buildFile({ name: "a.jpg" }),
            buildFile({ name: "b.jpg" }),
            buildFile({ name: "c.jpg" }),
        ];

        const result = selectFilesToUpload(files, {
            maxBytes: MAX_BYTES,
            maxImages: MAX_HOTEL_IMAGES,
            usedCount: 8,
        });

        expect(result.accepted).toEqual([files[0], files[1]]);
        expect(result.hasReachedLimit).toBe(true);
    });

    it("rejects invalid files without spending a slot", () => {
        const invalid = buildFile({ name: "a.png", type: "image/png" });
        const tooLarge = buildFile({ name: "b.jpg", size: MAX_BYTES + 1 });
        const valid = buildFile({ name: "c.jpg" });

        const result = selectFilesToUpload([invalid, tooLarge, valid], {
            maxBytes: MAX_BYTES,
            maxImages: MAX_HOTEL_IMAGES,
            usedCount: 9,
        });

        expect(result).toEqual({
            accepted: [valid],
            rejected: [
                { file: invalid, error: INVALID_IMAGE_FORMAT_MESSAGE },
                {
                    file: tooLarge,
                    error: "A foto deve ter no máximo 10 MB.",
                },
            ],
            hasReachedLimit: false,
        });
    });

    it("accepts every valid file in an uncapped gallery", () => {
        const files = Array.from({ length: 12 }, (_, index) =>
            buildFile({ name: `foto-${index}.jpg` }),
        );

        const result = selectFilesToUpload(files, {
            maxBytes: MAX_BYTES,
            maxImages: null,
            usedCount: 40,
        });

        expect(result.accepted).toHaveLength(12);
        expect(result.hasReachedLimit).toBe(false);
    });
});
