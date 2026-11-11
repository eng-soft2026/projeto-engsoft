import { describe, expect, it, vi } from "vitest";
import { HOTEL_STATUSES } from "../../src/constants/hotel-statuses.js";
import { MAX_HOTEL_IMAGES } from "../../src/constants/media.js";
import { ERROR_CODES } from "../../src/lib/errors.js";
import { createHotelImageService } from "../../src/services/hotel-image-service.js";

const HOTEL_ID = "hotel-1";
const ASSET_ID = "3f1c2a4e-8b7d-4c6a-9e21-5d0b7a1c9f33";
const PUBLIC_ID = `hotels/${HOTEL_ID}/${ASSET_ID}`;
const TRANSACTION_CLIENT = Object.freeze({ id: "transaction-client" });
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const OWNER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const ADDITIONAL_MANAGER = Object.freeze({ id: "manager-3", role: "MANAGER" });
const OTHER_MANAGER = Object.freeze({ id: "manager-2", role: "MANAGER" });
const ADMIN = Object.freeze({ id: "admin-1", role: "ADMIN" });

const RESOURCE = Object.freeze({
    publicId: PUBLIC_ID,
    format: "jpg",
    bytes: 204_800,
    width: 1600,
    height: 900,
    secureUrl: `https://res.cloudinary.com/demo/image/upload/v1/${PUBLIC_ID}.jpg`,
});

function buildImage(index, overrides = {}) {
    return {
        id: `image-${index}`,
        hotelId: HOTEL_ID,
        cloudinaryPublicId: `hotels/${HOTEL_ID}/asset-${index}`,
        url: `https://res.cloudinary.com/demo/image/upload/asset-${index}.jpg`,
        isCover: index === 0,
        position: index,
        format: "jpg",
        bytes: 1000,
        width: 800,
        height: 600,
        ...overrides,
    };
}

function buildGallery(count) {
    return Array.from({ length: count }, (_, index) => buildImage(index));
}

function createWorld({
    hotelStatus = HOTEL_STATUSES.DRAFT,
    hotelStatusInTransaction = hotelStatus,
    images = [],
    imagesInTransaction = images,
    resource = RESOURCE,
    isReferenced = false,
    destroyResult = "ok",
} = {}) {
    const hotel = {
        ownerUserId: OWNER.id,
        managers: [{ userId: ADDITIONAL_MANAGER.id }],
    };
    const gallery = imagesInTransaction.map((image) => ({ ...image }));
    const calls = [];
    const hotelRepository = {
        findById: vi.fn(async (id, client) => {
            if (id !== HOTEL_ID) {
                return null;
            }
            const status = client ? hotelStatusInTransaction : hotelStatus;
            return { ...hotel, status };
        }),
        lockForUpdate: vi.fn(async () => calls.push("lock")),
    };
    const hotelImageRepository = {
        listByOwner: vi.fn(async (hotelId, client) =>
            (client ? gallery : images).map((image) => ({ ...image })),
        ),
        findById: vi.fn(async (id) => {
            const image = gallery.find((item) => item.id === id);
            return image ? { ...image } : null;
        }),
        create: vi.fn(async (data) => {
            calls.push("create");
            return { id: "image-new", ...data };
        }),
        updateFields: vi.fn(async (id, data) => {
            calls.push(["update", id, data]);
            Object.assign(
                gallery.find((item) => item.id === id),
                data,
            );
        }),
        clearCover: vi.fn(async () => {
            calls.push("clearCover");
            for (const image of gallery) {
                image.isCover = false;
            }
        }),
        delete: vi.fn(async (id) => {
            calls.push(["delete", id]);
            gallery.splice(
                gallery.findIndex((item) => item.id === id),
                1,
            );
        }),
    };
    const mediaReferenceRepository = {
        isPublicIdReferenced: vi.fn(async () => isReferenced),
    };
    const cloudinaryGateway = {
        getResource: vi.fn(async () => resource),
        destroy: vi.fn(async () => destroyResult),
    };
    const transactionRunner = {
        run: vi.fn(async (work) => {
            calls.push("begin");
            const result = await work(TRANSACTION_CLIENT);
            calls.push("commit");
            return result;
        }),
    };
    const logger = { warn: vi.fn() };
    const service = createHotelImageService({
        hotelImageRepository,
        hotelRepository,
        mediaReferenceRepository,
        cloudinaryGateway,
        transactionRunner,
        getLimits: () => ({
            maxImageBytes: MAX_IMAGE_BYTES,
            maxImageUploadMb: 10,
        }),
        logger,
    });
    return {
        service,
        hotelRepository,
        hotelImageRepository,
        cloudinaryGateway,
        mediaReferenceRepository,
        logger,
        gallery,
        calls,
    };
}

describe("hotelImageService.addImage", () => {
    it("registers the first photo as the cover with the real Cloudinary metadata (RN085)", async () => {
        const { service, hotelImageRepository, cloudinaryGateway } =
            createWorld();

        const image = await service.addImage(OWNER, HOTEL_ID, {
            assetId: ASSET_ID,
        });

        expect(cloudinaryGateway.getResource).toHaveBeenCalledWith({
            publicId: PUBLIC_ID,
            resourceType: "image",
        });
        expect(hotelImageRepository.create).toHaveBeenCalledWith(
            {
                hotelId: HOTEL_ID,
                cloudinaryPublicId: PUBLIC_ID,
                url: RESOURCE.secureUrl,
                isCover: true,
                position: 0,
                format: "jpg",
                bytes: RESOURCE.bytes,
                width: RESOURCE.width,
                height: RESOURCE.height,
            },
            TRANSACTION_CLIENT,
        );
        expect(image).not.toHaveProperty("cloudinaryPublicId");
    });

    it("appends a later photo without changing the cover", async () => {
        const { service, hotelImageRepository } = createWorld({
            images: buildGallery(2),
        });

        await service.addImage(ADDITIONAL_MANAGER, HOTEL_ID, {
            assetId: ASSET_ID,
        });

        expect(hotelImageRepository.clearCover).not.toHaveBeenCalled();
        expect(hotelImageRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ isCover: false, position: 2 }),
            TRANSACTION_CLIENT,
        );
    });

    it("moves the cover to a new photo sent with isCover", async () => {
        const { service, hotelImageRepository, calls } = createWorld({
            images: buildGallery(2),
        });

        await service.addImage(OWNER, HOTEL_ID, {
            assetId: ASSET_ID,
            isCover: true,
        });

        expect(hotelImageRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ isCover: true }),
            TRANSACTION_CLIENT,
        );
        expect(calls.indexOf("clearCover")).toBeLessThan(
            calls.indexOf("create"),
        );
    });

    it("refuses the 11th photo inside the locked transaction", async () => {
        const { service, hotelImageRepository, calls } = createWorld({
            images: buildGallery(MAX_HOTEL_IMAGES - 1),
            imagesInTransaction: buildGallery(MAX_HOTEL_IMAGES),
        });

        await expect(
            service.addImage(OWNER, HOTEL_ID, { assetId: ASSET_ID }),
        ).rejects.toMatchObject({
            code: ERROR_CODES.HOTEL_IMAGE_LIMIT_REACHED,
        });
        expect(calls.slice(0, 2)).toEqual(["begin", "lock"]);
        expect(hotelImageRepository.create).not.toHaveBeenCalled();
    });

    it("rechecks the DRAFT status after the lock (RN120)", async () => {
        const { service, hotelImageRepository } = createWorld({
            hotelStatusInTransaction: HOTEL_STATUSES.UNDER_REVIEW,
        });

        await expect(
            service.addImage(OWNER, HOTEL_ID, { assetId: ASSET_ID }),
        ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_HOTEL_STATUS });
        expect(hotelImageRepository.create).not.toHaveBeenCalled();
    });

    it("refuses a hotel out of DRAFT before reaching Cloudinary", async () => {
        const { service, cloudinaryGateway } = createWorld({
            hotelStatus: HOTEL_STATUSES.PUBLISHED,
        });

        await expect(
            service.addImage(OWNER, HOTEL_ID, { assetId: ASSET_ID }),
        ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_HOTEL_STATUS });
        expect(cloudinaryGateway.getResource).not.toHaveBeenCalled();
    });

    it("answers MEDIA_NOT_FOUND when the asset was never uploaded", async () => {
        const { service } = createWorld({ resource: null });

        await expect(
            service.addImage(OWNER, HOTEL_ID, { assetId: ASSET_ID }),
        ).rejects.toMatchObject({ code: ERROR_CODES.MEDIA_NOT_FOUND });
    });

    it("answers MEDIA_IN_USE for an asset already registered", async () => {
        const { service, cloudinaryGateway } = createWorld({
            isReferenced: true,
        });

        await expect(
            service.addImage(OWNER, HOTEL_ID, { assetId: ASSET_ID }),
        ).rejects.toMatchObject({ code: ERROR_CODES.MEDIA_IN_USE });
        expect(cloudinaryGateway.getResource).not.toHaveBeenCalled();
    });

    it("destroys an asset whose real size exceeds the limit (RF116)", async () => {
        const { service, cloudinaryGateway, hotelImageRepository } =
            createWorld({
                resource: { ...RESOURCE, bytes: MAX_IMAGE_BYTES + 1 },
            });

        await expect(
            service.addImage(OWNER, HOTEL_ID, { assetId: ASSET_ID }),
        ).rejects.toMatchObject({ code: ERROR_CODES.MEDIA_TOO_LARGE });
        expect(cloudinaryGateway.destroy).toHaveBeenCalledWith({
            publicId: PUBLIC_ID,
            resourceType: "image",
        });
        expect(hotelImageRepository.create).not.toHaveBeenCalled();
    });

    it("destroys an asset whose real format is not JPG (RF113)", async () => {
        const { service, cloudinaryGateway } = createWorld({
            resource: { ...RESOURCE, format: "png" },
        });

        await expect(
            service.addImage(OWNER, HOTEL_ID, { assetId: ASSET_ID }),
        ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_MEDIA_TYPE });
        expect(cloudinaryGateway.destroy).toHaveBeenCalledOnce();
    });

    it("hides the hotel from other managers and from the admin", async () => {
        const { service } = createWorld();

        await expect(
            service.addImage(OTHER_MANAGER, HOTEL_ID, { assetId: ASSET_ID }),
        ).rejects.toMatchObject({ code: ERROR_CODES.HOTEL_NOT_FOUND });
        await expect(
            service.addImage(ADMIN, HOTEL_ID, { assetId: ASSET_ID }),
        ).rejects.toMatchObject({ code: ERROR_CODES.HOTEL_NOT_FOUND });
    });
});

describe("hotelImageService.listImages", () => {
    it("lists the gallery for the managers and the admin", async () => {
        const { service } = createWorld({ images: buildGallery(2) });

        const images = await service.listImages(ADMIN, HOTEL_ID);

        expect(images.map(({ id }) => id)).toEqual(["image-0", "image-1"]);
        expect(images[0]).not.toHaveProperty("cloudinaryPublicId");
        await expect(
            service.listImages(ADDITIONAL_MANAGER, HOTEL_ID),
        ).resolves.toHaveLength(2);
    });

    it("answers 404 to a manager outside the hotel", async () => {
        const { service } = createWorld();

        await expect(
            service.listImages(OTHER_MANAGER, HOTEL_ID),
        ).rejects.toMatchObject({ code: ERROR_CODES.HOTEL_NOT_FOUND });
    });
});

describe("hotelImageService.updateImage", () => {
    it("moves the cover to another photo", async () => {
        const { service, gallery } = createWorld({ images: buildGallery(3) });

        const image = await service.updateImage(OWNER, HOTEL_ID, "image-2", {
            isCover: true,
        });

        expect(image.isCover).toBe(true);
        expect(gallery.filter(({ isCover }) => isCover)).toHaveLength(1);
    });

    it("reorders the gallery keeping the positions contiguous", async () => {
        const { service, gallery } = createWorld({ images: buildGallery(4) });

        await service.updateImage(OWNER, HOTEL_ID, "image-3", {
            position: 1,
        });

        const order = [...gallery]
            .sort((left, right) => left.position - right.position)
            .map(({ id }) => id);
        expect(order).toEqual(["image-0", "image-3", "image-1", "image-2"]);
        expect(gallery.map(({ position }) => position).sort()).toEqual([
            0, 1, 2, 3,
        ]);
    });

    it("refuses a position past the end of the gallery", async () => {
        const { service } = createWorld({ images: buildGallery(2) });

        await expect(
            service.updateImage(OWNER, HOTEL_ID, "image-0", { position: 2 }),
        ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_ERROR });
    });

    it("answers HOTEL_IMAGE_NOT_FOUND for a photo of another hotel", async () => {
        const { service } = createWorld({ images: buildGallery(1) });

        await expect(
            service.updateImage(OWNER, HOTEL_ID, "image-9", { isCover: true }),
        ).rejects.toMatchObject({ code: ERROR_CODES.HOTEL_IMAGE_NOT_FOUND });
    });

    it("refuses when the hotel is not in DRAFT", async () => {
        const { service, hotelImageRepository } = createWorld({
            images: buildGallery(2),
            hotelStatus: HOTEL_STATUSES.PUBLISHED,
        });

        await expect(
            service.updateImage(OWNER, HOTEL_ID, "image-1", { isCover: true }),
        ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_HOTEL_STATUS });
        expect(hotelImageRepository.updateFields).not.toHaveBeenCalled();
    });
});

describe("hotelImageService.deleteImage", () => {
    it("promotes the first remaining photo when the cover is removed", async () => {
        const { service, gallery, cloudinaryGateway, calls } = createWorld({
            images: buildGallery(3),
        });

        const result = await service.deleteImage(OWNER, HOTEL_ID, "image-0");

        expect(result).toEqual({ id: "image-0", removed: true });
        expect(gallery).toEqual([
            expect.objectContaining({
                id: "image-1",
                position: 0,
                isCover: true,
            }),
            expect.objectContaining({
                id: "image-2",
                position: 1,
                isCover: false,
            }),
        ]);
        expect(cloudinaryGateway.destroy).toHaveBeenCalledWith({
            publicId: `hotels/${HOTEL_ID}/asset-0`,
            resourceType: "image",
        });
        expect(calls.at(-1)).toBe("commit");
    });

    it("keeps the cover when another photo is removed", async () => {
        const { service, gallery } = createWorld({ images: buildGallery(3) });

        await service.deleteImage(OWNER, HOTEL_ID, "image-1");

        expect(gallery.filter(({ isCover }) => isCover)).toEqual([
            expect.objectContaining({ id: "image-0" }),
        ]);
    });

    it("removes the last photo leaving an empty gallery", async () => {
        const { service, gallery } = createWorld({ images: buildGallery(1) });

        await service.deleteImage(OWNER, HOTEL_ID, "image-0");

        expect(gallery).toEqual([]);
    });

    it("only logs a Cloudinary failure after the commit", async () => {
        const { service, cloudinaryGateway, logger } = createWorld({
            images: buildGallery(2),
        });
        cloudinaryGateway.destroy.mockRejectedValueOnce(new Error("timeout"));

        await expect(
            service.deleteImage(OWNER, HOTEL_ID, "image-1"),
        ).resolves.toEqual({ id: "image-1", removed: true });
        expect(logger.warn).toHaveBeenCalledWith(
            "Cloudinary asset not destroyed",
            expect.objectContaining({ hotelId: HOTEL_ID, imageId: "image-1" }),
        );
    });

    it("refuses when the hotel is not in DRAFT", async () => {
        const { service, hotelImageRepository } = createWorld({
            images: buildGallery(2),
            hotelStatus: HOTEL_STATUSES.BLOCKED,
        });

        await expect(
            service.deleteImage(OWNER, HOTEL_ID, "image-1"),
        ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_HOTEL_STATUS });
        expect(hotelImageRepository.delete).not.toHaveBeenCalled();
    });
});
