import { getMediaLimits } from "../../config/media.js";
import {
    MEDIA_RESOURCE_TYPES,
    MEDIA_SCOPES,
    MEDIA_SCOPE_KINDS,
    SIGNED_UPLOAD_TTL_SECONDS,
} from "../../constants/media.js";
import { ConflictError, ERROR_CODES, NotFoundError } from "../../lib/errors.js";
import { hotelRepository as defaultHotelRepository } from "../../repositories/hotel-repository.js";
import { mediaReferenceRepository as defaultMediaReferenceRepository } from "../../repositories/media-reference-repository.js";
import { roomTypeRepository as defaultRoomTypeRepository } from "../../repositories/room-type-repository.js";
import { unitRepository as defaultUnitRepository } from "../../repositories/unit-repository.js";
import { canManageHotel } from "../hotels/hotel-access.js";
import {
    canEditHotel,
    createInvalidHotelStatusError,
} from "../hotels/hotel-status-machine.js";
import {
    CLOUDINARY_DESTROY_RESULTS,
    cloudinaryGateway as defaultCloudinaryGateway,
} from "./cloudinary-gateway.js";
import {
    buildMediaFolder,
    buildMediaPublicId,
    validateMediaFile,
} from "./media-rules.js";

const TARGET_NOT_FOUND_ERRORS = Object.freeze({
    [MEDIA_SCOPES.HOTEL]: [
        ERROR_CODES.HOTEL_NOT_FOUND,
        "Hotel não encontrado.",
    ],
    [MEDIA_SCOPES.UNIT]: [
        ERROR_CODES.UNIT_NOT_FOUND,
        "Unidade não encontrada.",
    ],
    [MEDIA_SCOPES.ROOM_TYPE]: [
        ERROR_CODES.ROOM_TYPE_NOT_FOUND,
        "Tipo de acomodação não encontrado.",
    ],
});

function createTargetNotFoundError(scope) {
    const [code, message] = TARGET_NOT_FOUND_ERRORS[scope];
    return new NotFoundError(code, message);
}

function createMediaNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.MEDIA_NOT_FOUND,
        "Mídia não encontrada.",
    );
}

function createMediaInUseError() {
    return new ConflictError(
        ERROR_CODES.MEDIA_IN_USE,
        "A mídia está em uso. Remova a imagem pelo cadastro correspondente.",
    );
}

function toUnixSeconds(date) {
    return Math.floor(date.getTime() / 1000);
}

function resolveScopeResourceType(scope) {
    const [kind] = MEDIA_SCOPE_KINDS[scope];
    return MEDIA_RESOURCE_TYPES[kind];
}

export function createMediaService({
    cloudinaryGateway,
    hotelRepository,
    unitRepository,
    roomTypeRepository,
    mediaReferenceRepository,
    getLimits = getMediaLimits,
    clock = () => new Date(),
    generateId = () => crypto.randomUUID(),
}) {
    const targetHotelLoaders = Object.freeze({
        [MEDIA_SCOPES.HOTEL]: (id) => hotelRepository.findById(id),
        [MEDIA_SCOPES.UNIT]: async (id) =>
            (await unitRepository.findByIdWithHotel(id))?.hotel,
        [MEDIA_SCOPES.ROOM_TYPE]: async (id) =>
            (await roomTypeRepository.findByIdWithHotel(id))?.hotel,
    });

    async function findManagedTargetHotelOrThrow(manager, scope, targetId) {
        const hotel = await targetHotelLoaders[scope](targetId);
        if (!hotel || !canManageHotel(manager, hotel)) {
            throw createTargetNotFoundError(scope);
        }
        return hotel;
    }

    async function signUpload(manager, input) {
        const { scope, targetId } = input;
        const file = validateMediaFile(input, {
            allowedKinds: MEDIA_SCOPE_KINDS[scope],
            limits: getLimits(),
        });
        const hotel = await findManagedTargetHotelOrThrow(
            manager,
            scope,
            targetId,
        );
        if (!canEditHotel(hotel.status)) {
            throw createInvalidHotelStatusError();
        }

        const assetId = generateId();
        const publicId = buildMediaPublicId(scope, targetId, assetId);
        const timestamp = toUnixSeconds(clock());
        const signed = cloudinaryGateway.signUpload({
            publicId,
            allowedFormats: file.allowedFormats,
            resourceType: file.resourceType,
            timestamp,
        });
        return {
            assetId,
            publicId,
            folder: buildMediaFolder(scope, targetId),
            resourceType: file.resourceType,
            allowedFormats: file.allowedFormats,
            maxBytes: file.maxBytes,
            uploadUrl: signed.uploadUrl,
            cloudName: signed.cloudName,
            apiKey: signed.apiKey,
            timestamp,
            signature: signed.signature,
            expiresAt: new Date(
                (timestamp + SIGNED_UPLOAD_TTL_SECONDS) * 1000,
            ).toISOString(),
        };
    }

    async function deleteAsset(manager, { assetId, scope, targetId }) {
        await findManagedTargetHotelOrThrow(manager, scope, targetId);
        const publicId = buildMediaPublicId(scope, targetId, assetId);
        const isReferenced =
            await mediaReferenceRepository.isPublicIdReferenced(
                scope,
                publicId,
            );
        if (isReferenced) {
            throw createMediaInUseError();
        }

        const result = await cloudinaryGateway.destroy({
            publicId,
            resourceType: resolveScopeResourceType(scope),
        });
        if (result === CLOUDINARY_DESTROY_RESULTS.NOT_FOUND) {
            throw createMediaNotFoundError();
        }
        if (result !== CLOUDINARY_DESTROY_RESULTS.OK) {
            throw new Error(`Unexpected Cloudinary destroy result: ${result}`);
        }
        return { assetId, publicId };
    }

    return Object.freeze({ signUpload, deleteAsset });
}

export const mediaService = createMediaService({
    cloudinaryGateway: defaultCloudinaryGateway,
    hotelRepository: defaultHotelRepository,
    unitRepository: defaultUnitRepository,
    roomTypeRepository: defaultRoomTypeRepository,
    mediaReferenceRepository: defaultMediaReferenceRepository,
});
