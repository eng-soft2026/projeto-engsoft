import { MAX_HOTEL_IMAGES, MEDIA_SCOPES } from "../constants/media.js";
import { ConflictError, ERROR_CODES, NotFoundError } from "../lib/errors.js";
import { transactionRunner as defaultTransactionRunner } from "../lib/transaction.js";
import { cloudinaryGateway as defaultCloudinaryGateway } from "../modules/media/cloudinary-gateway.js";
import {
    createImageGalleryService,
    presentGalleryImage,
} from "../modules/media/image-gallery.js";
import { hotelImageRepository as defaultHotelImageRepository } from "../repositories/hotel-image-repository.js";
import { hotelRepository as defaultHotelRepository } from "../repositories/hotel-repository.js";
import { mediaReferenceRepository as defaultMediaReferenceRepository } from "../repositories/media-reference-repository.js";

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

function createImageLimitError() {
    return new ConflictError(
        ERROR_CODES.HOTEL_IMAGE_LIMIT_REACHED,
        `O hotel pode ter no máximo ${MAX_HOTEL_IMAGES} fotos.`,
    );
}

export const presentHotelImage = presentGalleryImage;

export function createHotelImageService({
    hotelImageRepository,
    hotelRepository,
    ...dependencies
}) {
    async function loadOwner(hotelId, client) {
        const hotel = await hotelRepository.findById(hotelId, client);
        return hotel ? { hotelId, hotel } : null;
    }

    return createImageGalleryService({
        ...dependencies,
        hotelRepository,
        imageRepository: hotelImageRepository,
        gallery: {
            scope: MEDIA_SCOPES.HOTEL,
            ownerField: "hotelId",
            loadOwner,
            maxImages: MAX_HOTEL_IMAGES,
            createOwnerNotFoundError: createHotelNotFoundError,
            createImageNotFoundError,
            createImageLimitError,
        },
    });
}

export const hotelImageService = createHotelImageService({
    hotelImageRepository: defaultHotelImageRepository,
    hotelRepository: defaultHotelRepository,
    mediaReferenceRepository: defaultMediaReferenceRepository,
    cloudinaryGateway: defaultCloudinaryGateway,
    transactionRunner: defaultTransactionRunner,
});
