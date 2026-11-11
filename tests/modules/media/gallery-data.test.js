import { describe, expect, it, vi } from "vitest";
import { MEDIA_SCOPES } from "../../../src/constants/media.js";
import {
    createGalleryLoader,
    toClientGalleryImage,
} from "../../../src/modules/media/gallery-data.js";

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const STORED_IMAGE = Object.freeze({
    id: "image-1",
    url: "https://res.cloudinary.com/demo/image/upload/hotels/h/a.jpg",
    position: 0,
    format: "jpg",
    bytes: 2048,
    width: 1200,
    height: 800,
    isCover: true,
    createdAt: new Date("2026-11-11T12:00:00.000Z"),
});

function createLoader() {
    const imageServices = {
        [MEDIA_SCOPES.HOTEL]: { listImages: vi.fn() },
        [MEDIA_SCOPES.ROOM_TYPE]: { listImages: vi.fn() },
    };
    const getLimits = vi.fn(() => ({ maxImageBytes: MAX_IMAGE_BYTES }));
    return {
        imageServices,
        getLimits,
        loader: createGalleryLoader({ imageServices, getLimits }),
    };
}

describe("toClientGalleryImage", () => {
    it("keeps only the fields the gallery renders", () => {
        expect(toClientGalleryImage(STORED_IMAGE)).toEqual({
            id: "image-1",
            url: STORED_IMAGE.url,
            position: 0,
            width: 1200,
            height: 800,
            isCover: true,
        });
    });

    it("treats an image without cover flag as not cover", () => {
        const roomTypeImage = { ...STORED_IMAGE };
        delete roomTypeImage.isCover;

        expect(toClientGalleryImage(roomTypeImage).isCover).toBe(false);
    });
});

describe("loadGalleryData", () => {
    it("lists the images of the scope and exposes the size limit", async () => {
        const { loader, imageServices } = createLoader();
        imageServices[MEDIA_SCOPES.HOTEL].listImages.mockResolvedValue([
            STORED_IMAGE,
        ]);

        const data = await loader.loadGalleryData(
            MANAGER,
            MEDIA_SCOPES.HOTEL,
            "hotel-1",
        );

        expect(
            imageServices[MEDIA_SCOPES.HOTEL].listImages,
        ).toHaveBeenCalledWith(MANAGER, "hotel-1");
        expect(data).toEqual({
            images: [toClientGalleryImage(STORED_IMAGE)],
            maxBytes: MAX_IMAGE_BYTES,
        });
    });

    it("refuses an unknown scope", async () => {
        const { loader } = createLoader();

        await expect(
            loader.loadGalleryData(MANAGER, "REVIEW", "review-1"),
        ).rejects.toThrow(TypeError);
    });
});
