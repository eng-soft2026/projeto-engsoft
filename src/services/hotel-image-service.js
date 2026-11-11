import { getMediaLimits } from "../config/media.js";
import {
    MAX_HOTEL_IMAGES,
    MEDIA_KINDS,
    MEDIA_RESOURCE_TYPES,
    MEDIA_SCOPES,
} from "../constants/media.js";
import {
    ConflictError,
    ERROR_CODES,
    NotFoundError,
    ValidationError,
} from "../lib/errors.js";
import { logger as defaultLogger, serializeError } from "../lib/logger.js";
import { transactionRunner as defaultTransactionRunner } from "../lib/transaction.js";
import {
    canManageHotel,
    canViewHotel,
} from "../modules/hotels/hotel-access.js";
import {
    canEditHotel,
    createInvalidHotelStatusError,
} from "../modules/hotels/hotel-status-machine.js";
import {
    CLOUDINARY_DESTROY_RESULTS,
    cloudinaryGateway as defaultCloudinaryGateway,
} from "../modules/media/cloudinary-gateway.js";
import {
    buildMediaPublicId,
    validateStoredImage,
} from "../modules/media/media-rules.js";
import { hotelImageRepository as defaultHotelImageRepository } from "../repositories/hotel-image-repository.js";
import { hotelRepository as defaultHotelRepository } from "../repositories/hotel-repository.js";
import { mediaReferenceRepository as defaultMediaReferenceRepository } from "../repositories/media-reference-repository.js";

const IMAGE_RESOURCE_TYPE = MEDIA_RESOURCE_TYPES[MEDIA_KINDS.IMAGE];

function createHotelNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.HOTEL_NOT_FOUND,
        "Hotel não encontrado.",
    );
}

function createImageNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.HOTEL_IMAGE_NOT_FOUND,
        "Foto não encontrada.",
    );
}

function createMediaNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.MEDIA_NOT_FOUND,
        "Mídia não encontrada. Envie o arquivo antes de registrar a foto.",
    );
}

function createMediaInUseError() {
    return new ConflictError(
        ERROR_CODES.MEDIA_IN_USE,
        "Esta foto já está registrada.",
    );
}

function createImageLimitError() {
    return new ConflictError(
        ERROR_CODES.HOTEL_IMAGE_LIMIT_REACHED,
        `O hotel pode ter no máximo ${MAX_HOTEL_IMAGES} fotos.`,
    );
}

function createInvalidPositionError() {
    return new ValidationError("Informe uma posição válida.");
}

export function presentHotelImage(image) {
    const presented = { ...image };
    delete presented.cloudinaryPublicId;
    return presented;
}

function moveToPosition(images, image, position) {
    const others = images.filter(({ id }) => id !== image.id);
    return [...others.slice(0, position), image, ...others.slice(position)];
}

export function createHotelImageService({
    hotelImageRepository,
    hotelRepository,
    mediaReferenceRepository,
    cloudinaryGateway,
    transactionRunner,
    getLimits = getMediaLimits,
    logger = defaultLogger,
}) {
    function assertHotelIsEditable(hotel) {
        if (!canEditHotel(hotel.status)) {
            throw createInvalidHotelStatusError();
        }
    }

    async function findManagedHotelOrThrow(manager, hotelId, client) {
        const hotel = await hotelRepository.findById(hotelId, client);
        if (!hotel || !canManageHotel(manager, hotel)) {
            throw createHotelNotFoundError();
        }
        return hotel;
    }

    async function findEditableHotelOrThrow(manager, hotelId) {
        const hotel = await findManagedHotelOrThrow(manager, hotelId);
        assertHotelIsEditable(hotel);
        return hotel;
    }

    function runOnLockedGallery(manager, hotelId, work) {
        return transactionRunner.run(async (client) => {
            await hotelRepository.lockForUpdate(hotelId, client);
            const hotel = await findManagedHotelOrThrow(
                manager,
                hotelId,
                client,
            );
            assertHotelIsEditable(hotel);
            const images = await hotelImageRepository.listByHotel(
                hotelId,
                client,
            );
            return work(client, images);
        });
    }

    async function writePositions(images, client) {
        for (const [position, image] of images.entries()) {
            if (image.position !== position) {
                await hotelImageRepository.updateFields(
                    image.id,
                    { position },
                    client,
                );
            }
        }
    }

    async function makeCover(hotelId, imageId, client) {
        await hotelImageRepository.clearCover(hotelId, client);
        await hotelImageRepository.updateFields(
            imageId,
            { isCover: true },
            client,
        );
    }

    async function destroyAsset(publicId, context) {
        try {
            const result = await cloudinaryGateway.destroy({
                publicId,
                resourceType: IMAGE_RESOURCE_TYPE,
            });
            if (
                result !== CLOUDINARY_DESTROY_RESULTS.OK &&
                result !== CLOUDINARY_DESTROY_RESULTS.NOT_FOUND
            ) {
                logger.warn("Cloudinary asset not destroyed", {
                    ...context,
                    result,
                });
            }
        } catch (error) {
            logger.warn("Cloudinary asset not destroyed", {
                ...context,
                error: serializeError(error),
            });
        }
    }

    async function readVerifiedResource(hotelId, publicId) {
        const resource = await cloudinaryGateway.getResource({
            publicId,
            resourceType: IMAGE_RESOURCE_TYPE,
        });
        if (!resource) {
            throw createMediaNotFoundError();
        }
        try {
            const format = validateStoredImage(resource, getLimits());
            return { ...resource, format };
        } catch (error) {
            await destroyAsset(publicId, { hotelId, reason: error.code });
            throw error;
        }
    }

    async function listImages(user, hotelId) {
        const hotel = await hotelRepository.findById(hotelId);
        if (!hotel || !canViewHotel(user, hotel)) {
            throw createHotelNotFoundError();
        }
        const images = await hotelImageRepository.listByHotel(hotelId);
        return images.map(presentHotelImage);
    }

    async function addImage(manager, hotelId, { assetId, isCover }) {
        await findEditableHotelOrThrow(manager, hotelId);
        const publicId = buildMediaPublicId(
            MEDIA_SCOPES.HOTEL,
            hotelId,
            assetId,
        );
        if (
            await mediaReferenceRepository.isPublicIdReferenced(
                MEDIA_SCOPES.HOTEL,
                publicId,
            )
        ) {
            throw createMediaInUseError();
        }
        const resource = await readVerifiedResource(hotelId, publicId);

        const image = await runOnLockedGallery(
            manager,
            hotelId,
            async (client, images) => {
                const isReferenced =
                    await mediaReferenceRepository.isPublicIdReferenced(
                        MEDIA_SCOPES.HOTEL,
                        publicId,
                        client,
                    );
                if (isReferenced) {
                    throw createMediaInUseError();
                }
                if (images.length >= MAX_HOTEL_IMAGES) {
                    throw createImageLimitError();
                }
                const shouldBeCover = images.length === 0 || isCover === true;
                if (shouldBeCover) {
                    await hotelImageRepository.clearCover(hotelId, client);
                }
                return hotelImageRepository.create(
                    {
                        hotelId,
                        cloudinaryPublicId: publicId,
                        url: resource.secureUrl,
                        isCover: shouldBeCover,
                        position: images.length,
                        format: resource.format,
                        bytes: resource.bytes,
                        width: resource.width,
                        height: resource.height,
                    },
                    client,
                );
            },
        );
        return presentHotelImage(image);
    }

    async function updateImage(manager, hotelId, imageId, changes) {
        await findEditableHotelOrThrow(manager, hotelId);

        await runOnLockedGallery(manager, hotelId, async (client, images) => {
            const image = images.find(({ id }) => id === imageId);
            if (!image) {
                throw createImageNotFoundError();
            }
            if (changes.position !== undefined) {
                if (changes.position >= images.length) {
                    throw createInvalidPositionError();
                }
                await writePositions(
                    moveToPosition(images, image, changes.position),
                    client,
                );
            }
            if (changes.isCover && !image.isCover) {
                await makeCover(hotelId, image.id, client);
            }
        });
        return presentHotelImage(await hotelImageRepository.findById(imageId));
    }

    async function deleteImage(manager, hotelId, imageId) {
        await findEditableHotelOrThrow(manager, hotelId);

        const removed = await runOnLockedGallery(
            manager,
            hotelId,
            async (client, images) => {
                const image = images.find(({ id }) => id === imageId);
                if (!image) {
                    throw createImageNotFoundError();
                }
                await hotelImageRepository.delete(image.id, client);
                const remaining = images.filter(({ id }) => id !== image.id);
                await writePositions(remaining, client);
                if (image.isCover && remaining.length > 0) {
                    await hotelImageRepository.updateFields(
                        remaining[0].id,
                        { isCover: true },
                        client,
                    );
                }
                return image;
            },
        );

        await destroyAsset(removed.cloudinaryPublicId, {
            hotelId,
            imageId: removed.id,
        });
        return { id: removed.id, removed: true };
    }

    return Object.freeze({ listImages, addImage, updateImage, deleteImage });
}

export const hotelImageService = createHotelImageService({
    hotelImageRepository: defaultHotelImageRepository,
    hotelRepository: defaultHotelRepository,
    mediaReferenceRepository: defaultMediaReferenceRepository,
    cloudinaryGateway: defaultCloudinaryGateway,
    transactionRunner: defaultTransactionRunner,
});
