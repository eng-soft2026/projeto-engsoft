import { describe, expect, it, vi } from "vitest";
import { HOTEL_STATUSES } from "../../../src/constants/hotel-statuses.js";
import { ERROR_CODES, NotFoundError } from "../../../src/lib/errors.js";
import { createImageGalleryService } from "../../../src/modules/media/image-gallery.js";

const OWNER_ID = "room-type-1";
const ASSET_ID = "3f1c2a4e-8b7d-4c6a-9e21-5d0b7a1c9f33";
const TRANSACTION_CLIENT = Object.freeze({ id: "transaction-client" });
const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });

function buildImage(index) {
    return {
        id: `image-${index}`,
        cloudinaryPublicId: `room-types/${OWNER_ID}/asset-${index}`,
        position: index,
    };
}

function createGallery({ images = [], hasCover }) {
    const stored = images.map((image) => ({ ...image }));
    const imageRepository = {
        listByOwner: vi.fn(async () => stored.map((image) => ({ ...image }))),
        findById: vi.fn(async (id) => stored.find((item) => item.id === id)),
        create: vi.fn(async (data) => ({ id: "image-new", ...data })),
        updateFields: vi.fn(async (id, data) => {
            Object.assign(
                stored.find((item) => item.id === id),
                data,
            );
        }),
        clearCover: vi.fn(),
        delete: vi.fn(async (id) => {
            stored.splice(
                stored.findIndex((item) => item.id === id),
                1,
            );
        }),
    };
    const service = createImageGalleryService({
        gallery: {
            scope: "ROOM_TYPE",
            ownerField: "roomTypeId",
            loadOwner: async (id) =>
                id === OWNER_ID
                    ? {
                          hotelId: "hotel-1",
                          hotel: {
                              ownerUserId: MANAGER.id,
                              status: HOTEL_STATUSES.DRAFT,
                          },
                      }
                    : null,
            hasCover,
            createOwnerNotFoundError: () =>
                new NotFoundError(ERROR_CODES.ROOM_TYPE_NOT_FOUND, "x"),
            createImageNotFoundError: () =>
                new NotFoundError(ERROR_CODES.MEDIA_NOT_FOUND, "x"),
        },
        imageRepository,
        hotelRepository: { lockForUpdate: vi.fn() },
        mediaReferenceRepository: {
            isPublicIdReferenced: vi.fn(async () => false),
        },
        cloudinaryGateway: {
            getResource: vi.fn(async () => ({
                format: "jpg",
                bytes: 10,
                width: 1,
                height: 1,
                secureUrl: "https://res.cloudinary.com/demo/a.jpg",
            })),
            destroy: vi.fn(async () => "not found"),
        },
        transactionRunner: {
            run: vi.fn(async (work) => work(TRANSACTION_CLIENT)),
        },
        getLimits: () => ({ maxImageBytes: 100, maxImageUploadMb: 1 }),
        logger: { warn: vi.fn() },
    });
    return { service, imageRepository, stored };
}

describe("createImageGalleryService without a cover", () => {
    it("creates rows without isCover and never touches the cover", async () => {
        const { service, imageRepository } = createGallery({
            hasCover: false,
        });

        await service.addImage(MANAGER, OWNER_ID, {
            assetId: ASSET_ID,
            isCover: true,
        });

        const [data] = imageRepository.create.mock.calls[0];
        expect(data).not.toHaveProperty("isCover");
        expect(data).toMatchObject({
            roomTypeId: OWNER_ID,
            cloudinaryPublicId: `room-types/${OWNER_ID}/${ASSET_ID}`,
            position: 0,
        });
        expect(imageRepository.clearCover).not.toHaveBeenCalled();
    });

    it("removes a photo and compacts the positions without a cover", async () => {
        const { service, imageRepository, stored } = createGallery({
            hasCover: false,
            images: [buildImage(0), buildImage(1), buildImage(2)],
        });

        await service.deleteImage(MANAGER, OWNER_ID, "image-0");

        expect(stored.map(({ id, position }) => [id, position])).toEqual([
            ["image-1", 0],
            ["image-2", 1],
        ]);
        expect(imageRepository.updateFields).not.toHaveBeenCalledWith(
            expect.anything(),
            { isCover: true },
            TRANSACTION_CLIENT,
        );
    });

    it("ignores a cover change and answers the owner error for an unknown owner", async () => {
        const { service, imageRepository } = createGallery({
            hasCover: false,
            images: [buildImage(0), buildImage(1)],
        });

        await service.updateImage(MANAGER, OWNER_ID, "image-1", {
            isCover: true,
        });

        expect(imageRepository.clearCover).not.toHaveBeenCalled();
        await expect(
            service.listImages(MANAGER, "room-type-9"),
        ).rejects.toMatchObject({ code: ERROR_CODES.ROOM_TYPE_NOT_FOUND });
    });
});
