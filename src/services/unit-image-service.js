import { MEDIA_SCOPES } from "../constants/media.js";
import { ERROR_CODES, NotFoundError } from "../lib/errors.js";
import { transactionRunner as defaultTransactionRunner } from "../lib/transaction.js";
import { cloudinaryGateway as defaultCloudinaryGateway } from "../modules/media/cloudinary-gateway.js";
import { createImageGalleryService } from "../modules/media/image-gallery.js";
import { hotelRepository as defaultHotelRepository } from "../repositories/hotel-repository.js";
import { mediaReferenceRepository as defaultMediaReferenceRepository } from "../repositories/media-reference-repository.js";
import { unitImageRepository as defaultUnitImageRepository } from "../repositories/unit-image-repository.js";
import { unitRepository as defaultUnitRepository } from "../repositories/unit-repository.js";

function createUnitNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.UNIT_NOT_FOUND,
        "Unidade não encontrada.",
    );
}

function createImageNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.UNIT_IMAGE_NOT_FOUND,
        "Foto não encontrada.",
    );
}

export function createUnitImageService({
    unitImageRepository,
    unitRepository,
    ...dependencies
}) {
    async function loadOwner(unitId, client) {
        const unit = await unitRepository.findByIdWithHotel(unitId, client);
        return unit ? { hotelId: unit.hotelId, hotel: unit.hotel } : null;
    }

    return createImageGalleryService({
        ...dependencies,
        imageRepository: unitImageRepository,
        gallery: {
            scope: MEDIA_SCOPES.UNIT,
            ownerField: "unitId",
            loadOwner,
            createOwnerNotFoundError: createUnitNotFoundError,
            createImageNotFoundError,
        },
    });
}

export const unitImageService = createUnitImageService({
    unitImageRepository: defaultUnitImageRepository,
    unitRepository: defaultUnitRepository,
    hotelRepository: defaultHotelRepository,
    mediaReferenceRepository: defaultMediaReferenceRepository,
    cloudinaryGateway: defaultCloudinaryGateway,
    transactionRunner: defaultTransactionRunner,
});
