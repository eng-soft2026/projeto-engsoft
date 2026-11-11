import { MEDIA_SCOPES } from "../constants/media.js";
import { ConflictError, ERROR_CODES, NotFoundError } from "../lib/errors.js";
import { transactionRunner as defaultTransactionRunner } from "../lib/transaction.js";
import { cloudinaryGateway as defaultCloudinaryGateway } from "../modules/media/cloudinary-gateway.js";
import { createImageGalleryService } from "../modules/media/image-gallery.js";
import { hotelRepository as defaultHotelRepository } from "../repositories/hotel-repository.js";
import { mediaReferenceRepository as defaultMediaReferenceRepository } from "../repositories/media-reference-repository.js";
import { roomTypeImageRepository as defaultRoomTypeImageRepository } from "../repositories/room-type-image-repository.js";
import { roomTypeRepository as defaultRoomTypeRepository } from "../repositories/room-type-repository.js";

function createRoomTypeNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.ROOM_TYPE_NOT_FOUND,
        "Tipo de acomodação não encontrado.",
    );
}

function createImageNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.ROOM_TYPE_IMAGE_NOT_FOUND,
        "Foto não encontrada.",
    );
}

function assertRoomTypeIsActive(owner) {
    if (!owner.isActive) {
        throw new ConflictError(
            ERROR_CODES.ROOM_TYPE_INACTIVE,
            "O tipo de acomodação está desativado.",
        );
    }
}

export function createRoomTypeImageService({
    roomTypeImageRepository,
    roomTypeRepository,
    ...dependencies
}) {
    async function loadOwner(roomTypeId, client) {
        const roomType = await roomTypeRepository.findByIdWithHotel(
            roomTypeId,
            client,
        );
        if (!roomType) {
            return null;
        }
        return {
            hotelId: roomType.hotelId,
            hotel: roomType.hotel,
            isActive: roomType.isActive,
        };
    }

    return createImageGalleryService({
        ...dependencies,
        imageRepository: roomTypeImageRepository,
        gallery: {
            scope: MEDIA_SCOPES.ROOM_TYPE,
            ownerField: "roomTypeId",
            loadOwner,
            hasCover: false,
            assertOwnerIsWritable: assertRoomTypeIsActive,
            createOwnerNotFoundError: createRoomTypeNotFoundError,
            createImageNotFoundError,
        },
    });
}

export const roomTypeImageService = createRoomTypeImageService({
    roomTypeImageRepository: defaultRoomTypeImageRepository,
    roomTypeRepository: defaultRoomTypeRepository,
    hotelRepository: defaultHotelRepository,
    mediaReferenceRepository: defaultMediaReferenceRepository,
    cloudinaryGateway: defaultCloudinaryGateway,
    transactionRunner: defaultTransactionRunner,
});
