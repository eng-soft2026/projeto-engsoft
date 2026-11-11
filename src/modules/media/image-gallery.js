import { getMediaLimits } from "../../config/media.js";
import { MEDIA_KINDS, MEDIA_RESOURCE_TYPES } from "../../constants/media.js";
import {
    ConflictError,
    ERROR_CODES,
    NotFoundError,
    ValidationError,
} from "../../lib/errors.js";
import { logger as defaultLogger, serializeError } from "../../lib/logger.js";
import { canManageHotel, canViewHotel } from "../hotels/hotel-access.js";
import {
    canEditHotel,
    createInvalidHotelStatusError,
} from "../hotels/hotel-status-machine.js";
import { CLOUDINARY_DESTROY_RESULTS } from "./cloudinary-gateway.js";
import { buildMediaPublicId, validateStoredImage } from "./media-rules.js";

const IMAGE_RESOURCE_TYPE = MEDIA_RESOURCE_TYPES[MEDIA_KINDS.IMAGE];

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

function createInvalidPositionError() {
    return new ValidationError("Informe uma posição válida.");
}

export function presentGalleryImage(image) {
    const presented = { ...image };
    delete presented.cloudinaryPublicId;
    return presented;
}

function moveToPosition(images, image, position) {
    const others = images.filter(({ id }) => id !== image.id);
    return [...others.slice(0, position), image, ...others.slice(position)];
}

export function createImageGalleryService({
    gallery,
    imageRepository,
    hotelRepository,
    mediaReferenceRepository,
    cloudinaryGateway,
    transactionRunner,
    getLimits = getMediaLimits,
    logger = defaultLogger,
}) {
    const {
        scope,
        ownerField,
        loadOwner,
        maxImages = null,
        hasCover = true,
        createOwnerNotFoundError,
        createImageNotFoundError,
        createImageLimitError,
    } = gallery;

    async function findManagedOwnerOrThrow(manager, ownerId, client) {
        const owner = await loadOwner(ownerId, client);
        if (!owner || !canManageHotel(manager, owner.hotel)) {
            throw createOwnerNotFoundError();
        }
        return owner;
    }

    function assertHotelIsEditable(owner) {
        if (!canEditHotel(owner.hotel.status)) {
            throw createInvalidHotelStatusError();
        }
    }

    async function findEditableOwnerOrThrow(manager, ownerId) {
        const owner = await findManagedOwnerOrThrow(manager, ownerId);
        assertHotelIsEditable(owner);
        return owner;
    }

    function runOnLockedGallery(manager, owner, ownerId, work) {
        return transactionRunner.run(async (client) => {
            await hotelRepository.lockForUpdate(owner.hotelId, client);
            const current = await findManagedOwnerOrThrow(
                manager,
                ownerId,
                client,
            );
            assertHotelIsEditable(current);
            const images = await imageRepository.listByOwner(ownerId, client);
            return work(client, images);
        });
    }

    async function writePositions(images, client) {
        for (const [position, image] of images.entries()) {
            if (image.position !== position) {
                await imageRepository.updateFields(
                    image.id,
                    { position },
                    client,
                );
            }
        }
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

    async function readVerifiedResource(ownerId, publicId) {
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
            await destroyAsset(publicId, {
                [ownerField]: ownerId,
                reason: error.code,
            });
            throw error;
        }
    }

    async function assertAssetIsFree(publicId, client) {
        const isReferenced =
            await mediaReferenceRepository.isPublicIdReferenced(
                scope,
                publicId,
                client,
            );
        if (isReferenced) {
            throw createMediaInUseError();
        }
    }

    function findImageOrThrow(images, imageId) {
        const image = images.find(({ id }) => id === imageId);
        if (!image) {
            throw createImageNotFoundError();
        }
        return image;
    }

    async function listImages(user, ownerId) {
        const owner = await loadOwner(ownerId);
        if (!owner || !canViewHotel(user, owner.hotel)) {
            throw createOwnerNotFoundError();
        }
        const images = await imageRepository.listByOwner(ownerId);
        return images.map(presentGalleryImage);
    }

    async function addImage(manager, ownerId, { assetId, isCover }) {
        const owner = await findEditableOwnerOrThrow(manager, ownerId);
        const publicId = buildMediaPublicId(scope, ownerId, assetId);
        await assertAssetIsFree(publicId);
        const resource = await readVerifiedResource(ownerId, publicId);

        const image = await runOnLockedGallery(
            manager,
            owner,
            ownerId,
            async (client, images) => {
                await assertAssetIsFree(publicId, client);
                if (maxImages !== null && images.length >= maxImages) {
                    throw createImageLimitError();
                }
                const shouldBeCover =
                    hasCover && (images.length === 0 || isCover === true);
                if (shouldBeCover) {
                    await imageRepository.clearCover(ownerId, client);
                }
                return imageRepository.create(
                    {
                        [ownerField]: ownerId,
                        cloudinaryPublicId: publicId,
                        url: resource.secureUrl,
                        ...(hasCover && { isCover: shouldBeCover }),
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
        return presentGalleryImage(image);
    }

    async function updateImage(manager, ownerId, imageId, changes) {
        const owner = await findEditableOwnerOrThrow(manager, ownerId);

        await runOnLockedGallery(
            manager,
            owner,
            ownerId,
            async (client, images) => {
                const image = findImageOrThrow(images, imageId);
                if (changes.position !== undefined) {
                    if (changes.position >= images.length) {
                        throw createInvalidPositionError();
                    }
                    await writePositions(
                        moveToPosition(images, image, changes.position),
                        client,
                    );
                }
                if (hasCover && changes.isCover && !image.isCover) {
                    await imageRepository.clearCover(ownerId, client);
                    await imageRepository.updateFields(
                        image.id,
                        { isCover: true },
                        client,
                    );
                }
            },
        );
        return presentGalleryImage(await imageRepository.findById(imageId));
    }

    async function deleteImage(manager, ownerId, imageId) {
        const owner = await findEditableOwnerOrThrow(manager, ownerId);

        const removed = await runOnLockedGallery(
            manager,
            owner,
            ownerId,
            async (client, images) => {
                const image = findImageOrThrow(images, imageId);
                await imageRepository.delete(image.id, client);
                const remaining = images.filter(({ id }) => id !== image.id);
                await writePositions(remaining, client);
                if (hasCover && image.isCover && remaining.length > 0) {
                    await imageRepository.updateFields(
                        remaining[0].id,
                        { isCover: true },
                        client,
                    );
                }
                return image;
            },
        );

        await destroyAsset(removed.cloudinaryPublicId, {
            [ownerField]: ownerId,
            imageId: removed.id,
        });
        return { id: removed.id, removed: true };
    }

    return Object.freeze({ listImages, addImage, updateImage, deleteImage });
}
