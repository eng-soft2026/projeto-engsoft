import { describe, expect, it, vi } from "vitest";
import { HOTEL_STATUSES } from "../../src/constants/hotel-statuses.js";
import { ERROR_CODES } from "../../src/lib/errors.js";
import { createUnitImageService } from "../../src/services/unit-image-service.js";

const HOTEL_ID = "hotel-1";
const UNIT_ID = "unit-1";
const ASSET_ID = "3f1c2a4e-8b7d-4c6a-9e21-5d0b7a1c9f33";
const PUBLIC_ID = `units/${UNIT_ID}/${ASSET_ID}`;
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
        unitId: UNIT_ID,
        cloudinaryPublicId: `units/${UNIT_ID}/asset-${index}`,
        url: `https://res.cloudinary.com/demo/image/upload/asset-${index}.jpg`,
        isCover: index === 0,
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
    images = [],
    resource = RESOURCE,
} = {}) {
    const gallery = images.map((image) => ({ ...image }));
    const calls = [];
    const unitRepository = {
        findByIdWithHotel: vi.fn(async (id, client) => {
            if (id !== UNIT_ID) {
                return null;
            }
            return {
                id: UNIT_ID,
                hotelId: HOTEL_ID,
                hotel: {
                    ownerUserId: OWNER.id,
                    managers: [{ userId: ADDITIONAL_MANAGER.id }],
                    status: client ? hotelStatusInTransaction : hotelStatus,
                },
            };
        }),
    };
    const hotelRepository = {
        lockForUpdate: vi.fn(async () => calls.push("lock")),
    };
    const unitImageRepository = {
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
        clearCover: vi.fn(async () => {
            for (const image of gallery) {
                image.isCover = false;
            }
        }),
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
    const service = createUnitImageService({
        unitImageRepository,
        unitRepository,
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
        unitImageRepository,
        hotelRepository,
        cloudinaryGateway,
        gallery,
        calls,
    };
}

describe("unitImageService.addImage", () => {
    it("registers the first photo as the cover in the unit folder", async () => {
        const { service, unitImageRepository, cloudinaryGateway } =
            createWorld();

        const image = await service.addImage(OWNER, UNIT_ID, {
            assetId: ASSET_ID,
        });

        expect(cloudinaryGateway.getResource).toHaveBeenCalledWith({
            publicId: PUBLIC_ID,
            resourceType: "image",
        });
        expect(unitImageRepository.create).toHaveBeenCalledWith(
            {
                unitId: UNIT_ID,
                cloudinaryPublicId: PUBLIC_ID,
                url: RESOURCE.secureUrl,
                isCover: true,
                position: 0,
                format: "jpeg",
                bytes: RESOURCE.bytes,
                width: RESOURCE.width,
                height: RESOURCE.height,
            },
            TRANSACTION_CLIENT,
        );
        expect(image).not.toHaveProperty("cloudinaryPublicId");
    });

    it("locks the row of the unit's hotel", async () => {
        const { service, hotelRepository } = createWorld();

        await service.addImage(ADDITIONAL_MANAGER, UNIT_ID, {
            assetId: ASSET_ID,
        });

        expect(hotelRepository.lockForUpdate).toHaveBeenCalledWith(
            HOTEL_ID,
            TRANSACTION_CLIENT,
        );
    });

    it("has no fixed photo limit (RN086)", async () => {
        const { service, unitImageRepository } = createWorld({
            images: buildGallery(25),
        });

        await service.addImage(OWNER, UNIT_ID, { assetId: ASSET_ID });

        expect(unitImageRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ isCover: false, position: 25 }),
            TRANSACTION_CLIENT,
        );
    });

    it("rechecks the DRAFT status after the lock (RN124)", async () => {
        const { service, unitImageRepository } = createWorld({
            hotelStatusInTransaction: HOTEL_STATUSES.UNDER_REVIEW,
        });

        await expect(
            service.addImage(OWNER, UNIT_ID, { assetId: ASSET_ID }),
        ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_HOTEL_STATUS });
        expect(unitImageRepository.create).not.toHaveBeenCalled();
    });

    it("destroys an asset whose real size exceeds the limit", async () => {
        const { service, cloudinaryGateway } = createWorld({
            resource: { ...RESOURCE, bytes: MAX_IMAGE_BYTES + 1 },
        });

        await expect(
            service.addImage(OWNER, UNIT_ID, { assetId: ASSET_ID }),
        ).rejects.toMatchObject({ code: ERROR_CODES.MEDIA_TOO_LARGE });
        expect(cloudinaryGateway.destroy).toHaveBeenCalledWith({
            publicId: PUBLIC_ID,
            resourceType: "image",
        });
    });

    it("answers UNIT_NOT_FOUND to other managers, the admin and an unknown unit", async () => {
        const { service } = createWorld();

        for (const [user, unitId] of [
            [OTHER_MANAGER, UNIT_ID],
            [ADMIN, UNIT_ID],
            [OWNER, "unit-9"],
        ]) {
            await expect(
                service.addImage(user, unitId, { assetId: ASSET_ID }),
            ).rejects.toMatchObject({ code: ERROR_CODES.UNIT_NOT_FOUND });
        }
    });
});

describe("unitImageService.listImages", () => {
    it("lists the gallery for the managers and the admin", async () => {
        const { service } = createWorld({ images: buildGallery(2) });

        await expect(service.listImages(ADMIN, UNIT_ID)).resolves.toHaveLength(
            2,
        );
        await expect(
            service.listImages(ADDITIONAL_MANAGER, UNIT_ID),
        ).resolves.toHaveLength(2);
        await expect(
            service.listImages(OTHER_MANAGER, UNIT_ID),
        ).rejects.toMatchObject({ code: ERROR_CODES.UNIT_NOT_FOUND });
    });
});

describe("unitImageService.updateImage and deleteImage", () => {
    it("moves the cover and reorders beyond ten photos", async () => {
        const { service, gallery } = createWorld({ images: buildGallery(12) });

        await service.updateImage(OWNER, UNIT_ID, "image-11", {
            isCover: true,
            position: 0,
        });

        expect(gallery.filter(({ isCover }) => isCover)).toEqual([
            expect.objectContaining({ id: "image-11", position: 0 }),
        ]);
    });

    it("answers UNIT_IMAGE_NOT_FOUND for a photo outside the unit", async () => {
        const { service } = createWorld({ images: buildGallery(1) });

        await expect(
            service.updateImage(OWNER, UNIT_ID, "image-9", { isCover: true }),
        ).rejects.toMatchObject({ code: ERROR_CODES.UNIT_IMAGE_NOT_FOUND });
        await expect(
            service.deleteImage(OWNER, UNIT_ID, "image-9"),
        ).rejects.toMatchObject({ code: ERROR_CODES.UNIT_IMAGE_NOT_FOUND });
    });

    it("promotes the first remaining photo when the cover is removed", async () => {
        const { service, gallery, cloudinaryGateway } = createWorld({
            images: buildGallery(3),
        });

        await service.deleteImage(OWNER, UNIT_ID, "image-0");

        expect(gallery[0]).toMatchObject({
            id: "image-1",
            position: 0,
            isCover: true,
        });
        expect(cloudinaryGateway.destroy).toHaveBeenCalledWith({
            publicId: `units/${UNIT_ID}/asset-0`,
            resourceType: "image",
        });
    });

    it("refuses when the hotel is not in DRAFT", async () => {
        const { service, unitImageRepository } = createWorld({
            images: buildGallery(2),
            hotelStatus: HOTEL_STATUSES.PUBLISHED,
        });

        await expect(
            service.deleteImage(OWNER, UNIT_ID, "image-1"),
        ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_HOTEL_STATUS });
        expect(unitImageRepository.delete).not.toHaveBeenCalled();
    });
});
