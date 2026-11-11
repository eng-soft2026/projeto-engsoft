import { describe, expect, it, vi } from "vitest";
import { HOTEL_STATUSES } from "../../src/constants/hotel-statuses.js";
import { ERROR_CODES } from "../../src/lib/errors.js";
import { createRoomTypeImageService } from "../../src/services/room-type-image-service.js";

const HOTEL_ID = "hotel-1";
const ROOM_TYPE_ID = "room-type-1";
const ASSET_ID = "3f1c2a4e-8b7d-4c6a-9e21-5d0b7a1c9f33";
const PUBLIC_ID = `room-types/${ROOM_TYPE_ID}/${ASSET_ID}`;
const TRANSACTION_CLIENT = Object.freeze({ id: "transaction-client" });
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const OWNER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const ADDITIONAL_MANAGER = Object.freeze({ id: "manager-3", role: "MANAGER" });
const OTHER_MANAGER = Object.freeze({ id: "manager-2", role: "MANAGER" });
const ADMIN = Object.freeze({ id: "admin-1", role: "ADMIN" });

const RESOURCE = Object.freeze({
    publicId: PUBLIC_ID,
    format: "jpeg",
    bytes: 204_800,
    width: 1600,
    height: 900,
    secureUrl: `https://res.cloudinary.com/demo/image/upload/v1/${PUBLIC_ID}.jpg`,
});

function buildImage(index) {
    return {
        id: `image-${index}`,
        roomTypeId: ROOM_TYPE_ID,
        cloudinaryPublicId: `room-types/${ROOM_TYPE_ID}/asset-${index}`,
        url: `https://res.cloudinary.com/demo/image/upload/asset-${index}.jpg`,
        position: index,
        format: "jpg",
        bytes: 1000,
        width: 800,
        height: 600,
    };
}

function buildGallery(count) {
    return Array.from({ length: count }, (_, index) => buildImage(index));
}

function createWorld({
    hotelStatus = HOTEL_STATUSES.DRAFT,
    hotelStatusInTransaction = hotelStatus,
    isActive = true,
    isActiveInTransaction = isActive,
    images = [],
    resource = RESOURCE,
} = {}) {
    const gallery = images.map((image) => ({ ...image }));
    const roomTypeRepository = {
        findByIdWithHotel: vi.fn(async (id, client) => {
            if (id !== ROOM_TYPE_ID) {
                return null;
            }
            return {
                id: ROOM_TYPE_ID,
                hotelId: HOTEL_ID,
                isActive: client ? isActiveInTransaction : isActive,
                hotel: {
                    ownerUserId: OWNER.id,
                    managers: [{ userId: ADDITIONAL_MANAGER.id }],
                    status: client ? hotelStatusInTransaction : hotelStatus,
                },
            };
        }),
    };
    const hotelRepository = { lockForUpdate: vi.fn(async () => {}) };
    const roomTypeImageRepository = {
        listByOwner: vi.fn(async () => gallery.map((image) => ({ ...image }))),
        findById: vi.fn(async (id) => {
            const image = gallery.find((item) => item.id === id);
            return image ? { ...image } : null;
        }),
        create: vi.fn(async (data) => ({ id: "image-new", ...data })),
        updateFields: vi.fn(async (id, data) => {
            Object.assign(
                gallery.find((item) => item.id === id),
                data,
            );
        }),
        clearCover: vi.fn(),
        delete: vi.fn(async (id) => {
            gallery.splice(
                gallery.findIndex((item) => item.id === id),
                1,
            );
        }),
    };
    const cloudinaryGateway = {
        getResource: vi.fn(async () => resource),
        destroy: vi.fn(async () => "ok"),
    };
    const service = createRoomTypeImageService({
        roomTypeImageRepository,
        roomTypeRepository,
        hotelRepository,
        mediaReferenceRepository: {
            isPublicIdReferenced: vi.fn(async () => false),
        },
        cloudinaryGateway,
        transactionRunner: {
            run: vi.fn(async (work) => work(TRANSACTION_CLIENT)),
        },
        getLimits: () => ({
            maxImageBytes: MAX_IMAGE_BYTES,
            maxImageUploadMb: 10,
        }),
        logger: { warn: vi.fn() },
    });
    return {
        service,
        roomTypeImageRepository,
        hotelRepository,
        cloudinaryGateway,
        gallery,
    };
}

describe("roomTypeImageService.addImage", () => {
    it("registers the photo in the room type folder without a cover", async () => {
        const { service, roomTypeImageRepository, cloudinaryGateway } =
            createWorld();

        const image = await service.addImage(OWNER, ROOM_TYPE_ID, {
            assetId: ASSET_ID,
        });

        expect(cloudinaryGateway.getResource).toHaveBeenCalledWith({
            publicId: PUBLIC_ID,
            resourceType: "image",
        });
        expect(roomTypeImageRepository.create).toHaveBeenCalledWith(
            {
                roomTypeId: ROOM_TYPE_ID,
                cloudinaryPublicId: PUBLIC_ID,
                url: RESOURCE.secureUrl,
                position: 0,
                format: "jpeg",
                bytes: RESOURCE.bytes,
                width: RESOURCE.width,
                height: RESOURCE.height,
            },
            TRANSACTION_CLIENT,
        );
        expect(roomTypeImageRepository.clearCover).not.toHaveBeenCalled();
        expect(image).not.toHaveProperty("cloudinaryPublicId");
        expect(image).not.toHaveProperty("isCover");
    });

    it("locks the row of the hotel of the room type", async () => {
        const { service, hotelRepository } = createWorld();

        await service.addImage(ADDITIONAL_MANAGER, ROOM_TYPE_ID, {
            assetId: ASSET_ID,
        });

        expect(hotelRepository.lockForUpdate).toHaveBeenCalledWith(
            HOTEL_ID,
            TRANSACTION_CLIENT,
        );
    });

    it("has no fixed photo limit", async () => {
        const { service, roomTypeImageRepository } = createWorld({
            images: buildGallery(25),
        });

        await service.addImage(OWNER, ROOM_TYPE_ID, { assetId: ASSET_ID });

        expect(roomTypeImageRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ position: 25 }),
            TRANSACTION_CLIENT,
        );
    });

    it("rechecks the DRAFT status after the lock", async () => {
        const { service, roomTypeImageRepository } = createWorld({
            hotelStatusInTransaction: HOTEL_STATUSES.UNDER_REVIEW,
        });

        await expect(
            service.addImage(OWNER, ROOM_TYPE_ID, { assetId: ASSET_ID }),
        ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_HOTEL_STATUS });
        expect(roomTypeImageRepository.create).not.toHaveBeenCalled();
    });

    it("refuses an inactive room type before reading Cloudinary", async () => {
        const { service, cloudinaryGateway, roomTypeImageRepository } =
            createWorld({ isActive: false });

        await expect(
            service.addImage(OWNER, ROOM_TYPE_ID, { assetId: ASSET_ID }),
        ).rejects.toMatchObject({ code: ERROR_CODES.ROOM_TYPE_INACTIVE });
        expect(cloudinaryGateway.getResource).not.toHaveBeenCalled();
        expect(roomTypeImageRepository.create).not.toHaveBeenCalled();
    });

    it("rechecks the active flag after the lock", async () => {
        const { service, roomTypeImageRepository } = createWorld({
            isActiveInTransaction: false,
        });

        await expect(
            service.addImage(OWNER, ROOM_TYPE_ID, { assetId: ASSET_ID }),
        ).rejects.toMatchObject({ code: ERROR_CODES.ROOM_TYPE_INACTIVE });
        expect(roomTypeImageRepository.create).not.toHaveBeenCalled();
    });

    it("destroys an asset whose real size exceeds the limit", async () => {
        const { service, cloudinaryGateway } = createWorld({
            resource: { ...RESOURCE, bytes: MAX_IMAGE_BYTES + 1 },
        });

        await expect(
            service.addImage(OWNER, ROOM_TYPE_ID, { assetId: ASSET_ID }),
        ).rejects.toMatchObject({ code: ERROR_CODES.MEDIA_TOO_LARGE });
        expect(cloudinaryGateway.destroy).toHaveBeenCalledWith({
            publicId: PUBLIC_ID,
            resourceType: "image",
        });
    });

    it("answers ROOM_TYPE_NOT_FOUND to other managers, the admin and an unknown type", async () => {
        const { service } = createWorld();

        for (const [user, roomTypeId] of [
            [OTHER_MANAGER, ROOM_TYPE_ID],
            [ADMIN, ROOM_TYPE_ID],
            [OWNER, "room-type-9"],
        ]) {
            await expect(
                service.addImage(user, roomTypeId, { assetId: ASSET_ID }),
            ).rejects.toMatchObject({ code: ERROR_CODES.ROOM_TYPE_NOT_FOUND });
        }
    });
});

describe("roomTypeImageService.listImages", () => {
    it("lists the gallery for the managers and the admin, even when inactive", async () => {
        const { service } = createWorld({
            images: buildGallery(2),
            isActive: false,
        });

        await expect(
            service.listImages(ADMIN, ROOM_TYPE_ID),
        ).resolves.toHaveLength(2);
        await expect(
            service.listImages(ADDITIONAL_MANAGER, ROOM_TYPE_ID),
        ).resolves.toHaveLength(2);
        await expect(
            service.listImages(OTHER_MANAGER, ROOM_TYPE_ID),
        ).rejects.toMatchObject({ code: ERROR_CODES.ROOM_TYPE_NOT_FOUND });
    });
});

describe("roomTypeImageService.updateImage and deleteImage", () => {
    it("reorders the photos", async () => {
        const { service, gallery } = createWorld({ images: buildGallery(3) });

        await service.updateImage(OWNER, ROOM_TYPE_ID, "image-2", {
            position: 0,
        });

        expect(gallery.map(({ id, position }) => [id, position])).toEqual([
            ["image-0", 1],
            ["image-1", 2],
            ["image-2", 0],
        ]);
    });

    it("refuses a position past the last photo", async () => {
        const { service } = createWorld({ images: buildGallery(2) });

        await expect(
            service.updateImage(OWNER, ROOM_TYPE_ID, "image-0", {
                position: 2,
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_ERROR });
    });

    it("answers ROOM_TYPE_IMAGE_NOT_FOUND for a photo outside the room type", async () => {
        const { service } = createWorld({ images: buildGallery(1) });

        await expect(
            service.updateImage(OWNER, ROOM_TYPE_ID, "image-9", {
                position: 0,
            }),
        ).rejects.toMatchObject({
            code: ERROR_CODES.ROOM_TYPE_IMAGE_NOT_FOUND,
        });
        await expect(
            service.deleteImage(OWNER, ROOM_TYPE_ID, "image-9"),
        ).rejects.toMatchObject({
            code: ERROR_CODES.ROOM_TYPE_IMAGE_NOT_FOUND,
        });
    });

    it("removes a photo, compacts the positions and destroys the asset", async () => {
        const { service, gallery, cloudinaryGateway } = createWorld({
            images: buildGallery(3),
        });

        const result = await service.deleteImage(
            OWNER,
            ROOM_TYPE_ID,
            "image-0",
        );

        expect(result).toEqual({ id: "image-0", removed: true });
        expect(gallery.map(({ id, position }) => [id, position])).toEqual([
            ["image-1", 0],
            ["image-2", 1],
        ]);
        expect(cloudinaryGateway.destroy).toHaveBeenCalledWith({
            publicId: `room-types/${ROOM_TYPE_ID}/asset-0`,
            resourceType: "image",
        });
    });

    it("refuses writes on an inactive room type", async () => {
        const { service, roomTypeImageRepository } = createWorld({
            images: buildGallery(2),
            isActive: false,
        });

        await expect(
            service.deleteImage(OWNER, ROOM_TYPE_ID, "image-1"),
        ).rejects.toMatchObject({ code: ERROR_CODES.ROOM_TYPE_INACTIVE });
        await expect(
            service.updateImage(OWNER, ROOM_TYPE_ID, "image-1", {
                position: 0,
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.ROOM_TYPE_INACTIVE });
        expect(roomTypeImageRepository.delete).not.toHaveBeenCalled();
    });

    it("refuses when the hotel is not in DRAFT", async () => {
        const { service, roomTypeImageRepository } = createWorld({
            images: buildGallery(2),
            hotelStatus: HOTEL_STATUSES.PUBLISHED,
        });

        await expect(
            service.deleteImage(OWNER, ROOM_TYPE_ID, "image-1"),
        ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_HOTEL_STATUS });
        expect(roomTypeImageRepository.delete).not.toHaveBeenCalled();
    });
});
