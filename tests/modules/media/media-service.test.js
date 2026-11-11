import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMediaLimits } from "../../../src/config/media.js";
import { createMediaService } from "../../../src/modules/media/media-service.js";
import { createFakeClock } from "../../helpers/factories/index.js";

const OWNER = Object.freeze({ id: "owner-1", role: "MANAGER" });
const ADDITIONAL = Object.freeze({ id: "manager-2", role: "MANAGER" });
const OUTSIDER = Object.freeze({ id: "manager-3", role: "MANAGER" });
const HOTEL_ID = "3f1c2a4e-8b7d-4c6a-9e21-5d0b7a1c9f33";
const UNIT_ID = "7a1c9f33-8b7d-4c6a-9e21-3f1c2a4e5d0b";
const ROOM_TYPE_ID = "9e213f1c-2a4e-4c6a-8b7d-5d0b7a1c9f33";
const ASSET_ID = "5d0b7a1c-9f33-4c6a-8b7d-3f1c2a4e9e21";
const CLOCK_START = new Date("2026-11-11T12:00:00.000Z");

function buildHotel(overrides = {}) {
    return {
        id: HOTEL_ID,
        ownerUserId: OWNER.id,
        status: "DRAFT",
        managers: [{ userId: ADDITIONAL.id }],
        ...overrides,
    };
}

function buildSignInput(overrides = {}) {
    return {
        scope: "HOTEL",
        targetId: HOTEL_ID,
        fileName: "../../fachada.jpg",
        mimeType: "image/jpeg",
        bytes: 2048,
        ...overrides,
    };
}

describe("mediaService", () => {
    let hotel;
    let gateway;
    let mediaReferenceRepository;
    let service;

    beforeEach(() => {
        hotel = buildHotel();
        gateway = {
            signUpload: vi.fn(({ resourceType }) => ({
                signature: "assinatura-fake",
                apiKey: "chave-publica",
                cloudName: "demo-cloud",
                uploadUrl: `https://api.cloudinary.com/v1_1/demo-cloud/${resourceType}/upload`,
            })),
            destroy: vi.fn().mockResolvedValue("ok"),
        };
        mediaReferenceRepository = {
            isPublicIdReferenced: vi.fn().mockResolvedValue(false),
        };
        service = createMediaService({
            cloudinaryGateway: gateway,
            hotelRepository: {
                findById: vi.fn(async (id) => (id === HOTEL_ID ? hotel : null)),
            },
            unitRepository: {
                findByIdWithHotel: vi.fn(async (id) =>
                    id === UNIT_ID ? { id, hotel } : null,
                ),
            },
            roomTypeRepository: {
                findByIdWithHotel: vi.fn(async (id) =>
                    id === ROOM_TYPE_ID ? { id, hotel } : null,
                ),
            },
            mediaReferenceRepository,
            getLimits: () => getMediaLimits({}),
            clock: createFakeClock(CLOCK_START).now,
            generateId: () => ASSET_ID,
        });
    });

    describe("signUpload", () => {
        it("signs an upload with the folder and public id chosen by the app", async () => {
            const result = await service.signUpload(OWNER, buildSignInput());

            const timestamp = CLOCK_START.getTime() / 1000;
            expect(result).toEqual({
                assetId: ASSET_ID,
                publicId: `hotels/${HOTEL_ID}/${ASSET_ID}`,
                folder: `hotels/${HOTEL_ID}`,
                resourceType: "image",
                allowedFormats: ["jpg", "jpeg"],
                maxBytes: 10 * 1024 * 1024,
                uploadUrl:
                    "https://api.cloudinary.com/v1_1/demo-cloud/image/upload",
                cloudName: "demo-cloud",
                apiKey: "chave-publica",
                timestamp,
                signature: "assinatura-fake",
                expiresAt: "2026-11-11T13:00:00.000Z",
            });
            expect(gateway.signUpload).toHaveBeenCalledWith({
                publicId: `hotels/${HOTEL_ID}/${ASSET_ID}`,
                allowedFormats: ["jpg", "jpeg"],
                resourceType: "image",
                timestamp,
            });
        });

        it.each([
            ["UNIT", UNIT_ID, "units"],
            ["ROOM_TYPE", ROOM_TYPE_ID, "room-types"],
        ])(
            "uses the %s folder and authorizes by the target's hotel",
            async (scope, targetId, folder) => {
                const result = await service.signUpload(
                    ADDITIONAL,
                    buildSignInput({ scope, targetId }),
                );

                expect(result.publicId).toBe(
                    `${folder}/${targetId}/${ASSET_ID}`,
                );
            },
        );

        it.each([
            ["HOTEL", "HOTEL_NOT_FOUND"],
            ["UNIT", "UNIT_NOT_FOUND"],
            ["ROOM_TYPE", "ROOM_TYPE_NOT_FOUND"],
        ])(
            "answers 404 for a %s of a manager outside the hotel",
            async (scope, code) => {
                const targetId = {
                    HOTEL: HOTEL_ID,
                    UNIT: UNIT_ID,
                    ROOM_TYPE: ROOM_TYPE_ID,
                }[scope];

                await expect(
                    service.signUpload(
                        OUTSIDER,
                        buildSignInput({ scope, targetId }),
                    ),
                ).rejects.toMatchObject({ code });
                expect(gateway.signUpload).not.toHaveBeenCalled();
            },
        );

        it("answers 404 for a target that does not exist", async () => {
            await expect(
                service.signUpload(
                    OWNER,
                    buildSignInput({ scope: "UNIT", targetId: HOTEL_ID }),
                ),
            ).rejects.toMatchObject({ code: "UNIT_NOT_FOUND" });
        });

        it("refuses a hotel outside DRAFT", async () => {
            hotel = buildHotel({ status: "PUBLISHED" });

            await expect(
                service.signUpload(OWNER, buildSignInput()),
            ).rejects.toMatchObject({ code: "INVALID_HOTEL_STATUS" });
            expect(gateway.signUpload).not.toHaveBeenCalled();
        });

        it("refuses an image above the configured limit before signing", async () => {
            await expect(
                service.signUpload(
                    OWNER,
                    buildSignInput({ bytes: 10 * 1024 * 1024 + 1 }),
                ),
            ).rejects.toMatchObject({ code: "MEDIA_TOO_LARGE" });
            expect(gateway.signUpload).not.toHaveBeenCalled();
        });

        it.each([
            { fileName: "foto.png", mimeType: "image/png" },
            { fileName: "tour.mp4", mimeType: "video/mp4", durationSeconds: 5 },
        ])("refuses the format %o for a hotel gallery", async (overrides) => {
            await expect(
                service.signUpload(OWNER, buildSignInput(overrides)),
            ).rejects.toMatchObject({ code: "INVALID_MEDIA_TYPE" });
        });
    });

    describe("deleteAsset", () => {
        const TARGET = {
            assetId: ASSET_ID,
            scope: "HOTEL",
            targetId: HOTEL_ID,
        };

        it("destroys an unregistered asset of a managed hotel", async () => {
            const result = await service.deleteAsset(ADDITIONAL, TARGET);

            const publicId = `hotels/${HOTEL_ID}/${ASSET_ID}`;
            expect(result).toEqual({ assetId: ASSET_ID, publicId });
            expect(
                mediaReferenceRepository.isPublicIdReferenced,
            ).toHaveBeenCalledWith("HOTEL", publicId);
            expect(gateway.destroy).toHaveBeenCalledWith({
                publicId,
                resourceType: "image",
            });
        });

        it("answers 404 to a manager outside the hotel without touching Cloudinary", async () => {
            await expect(
                service.deleteAsset(OUTSIDER, TARGET),
            ).rejects.toMatchObject({ code: "HOTEL_NOT_FOUND" });
            expect(gateway.destroy).not.toHaveBeenCalled();
        });

        it("refuses an asset already registered in an image table", async () => {
            mediaReferenceRepository.isPublicIdReferenced.mockResolvedValue(
                true,
            );

            await expect(
                service.deleteAsset(OWNER, TARGET),
            ).rejects.toMatchObject({ code: "MEDIA_IN_USE" });
            expect(gateway.destroy).not.toHaveBeenCalled();
        });

        it("answers 404 MEDIA_NOT_FOUND when Cloudinary has no such asset", async () => {
            gateway.destroy.mockResolvedValue("not found");

            await expect(
                service.deleteAsset(OWNER, TARGET),
            ).rejects.toMatchObject({ code: "MEDIA_NOT_FOUND" });
        });

        it("fails with an unexpected error for an unknown destroy result", async () => {
            gateway.destroy.mockResolvedValue(undefined);

            await expect(service.deleteAsset(OWNER, TARGET)).rejects.toThrow(
                "Unexpected Cloudinary destroy result",
            );
        });
    });
});
