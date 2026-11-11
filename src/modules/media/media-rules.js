import {
    MEDIA_FORMATS_BY_MIME_TYPE,
    MEDIA_KINDS,
    MEDIA_RESOURCE_TYPES,
    MEDIA_SCOPE_FOLDERS,
} from "../../constants/media.js";
import { ERROR_CODES, ValidationError } from "../../lib/errors.js";

function createInvalidMediaTypeError(allowedKinds) {
    const isVideoAllowed = allowedKinds.includes(MEDIA_KINDS.VIDEO);
    const message = isVideoAllowed
        ? "Formato de arquivo não aceito. Envie imagens JPG ou JPEG, ou vídeos MP4, WebM ou MOV."
        : "Formato de arquivo não aceito. Envie imagens JPG ou JPEG.";
    return new ValidationError(message, ERROR_CODES.INVALID_MEDIA_TYPE);
}

export function resolveFileExtension(fileName) {
    const lastDot = fileName.lastIndexOf(".");
    if (lastDot <= 0 || lastDot === fileName.length - 1) {
        return null;
    }
    return fileName.slice(lastDot + 1).toLowerCase();
}

export function listAllowedFormats(kind) {
    return Object.values(MEDIA_FORMATS_BY_MIME_TYPE)
        .filter((format) => format.kind === kind)
        .flatMap((format) => format.extensions);
}

function assertSize(kind, bytes, limits) {
    const isImage = kind === MEDIA_KINDS.IMAGE;
    const maxBytes = isImage ? limits.maxImageBytes : limits.maxVideoBytes;
    if (bytes <= maxBytes) {
        return maxBytes;
    }
    const maxMb = isImage ? limits.maxImageUploadMb : limits.maxVideoUploadMb;
    const label = isImage ? "A imagem" : "O vídeo";
    throw new ValidationError(
        `${label} deve ter no máximo ${maxMb} MB.`,
        ERROR_CODES.MEDIA_TOO_LARGE,
    );
}

function assertVideoDuration(durationSeconds, limits) {
    if (durationSeconds === undefined || durationSeconds === null) {
        throw new ValidationError("Informe a duração do vídeo.");
    }
    if (durationSeconds > limits.maxReviewVideoSeconds) {
        throw new ValidationError(
            `O vídeo deve ter no máximo ${limits.maxReviewVideoSeconds} segundos.`,
            ERROR_CODES.VIDEO_TOO_LONG,
        );
    }
}

export function validateMediaFile(file, { allowedKinds, limits }) {
    const format = MEDIA_FORMATS_BY_MIME_TYPE[file.mimeType];
    const extension = resolveFileExtension(file.fileName);
    const isAccepted =
        Boolean(format) &&
        allowedKinds.includes(format.kind) &&
        format.extensions.includes(extension);
    if (!isAccepted) {
        throw createInvalidMediaTypeError(allowedKinds);
    }

    const maxBytes = assertSize(format.kind, file.bytes, limits);
    if (format.kind === MEDIA_KINDS.VIDEO) {
        assertVideoDuration(file.durationSeconds, limits);
    }
    return Object.freeze({
        kind: format.kind,
        extension,
        maxBytes,
        resourceType: MEDIA_RESOURCE_TYPES[format.kind],
        allowedFormats: listAllowedFormats(format.kind),
    });
}

export function buildMediaFolder(scope, targetId) {
    return `${MEDIA_SCOPE_FOLDERS[scope]}/${targetId}`;
}

export function buildMediaPublicId(scope, targetId, assetId) {
    return `${buildMediaFolder(scope, targetId)}/${assetId}`;
}

export function validateStoredImage(resource, limits) {
    const format = resource.format?.toLowerCase();
    if (!listAllowedFormats(MEDIA_KINDS.IMAGE).includes(format)) {
        throw createInvalidMediaTypeError([MEDIA_KINDS.IMAGE]);
    }
    assertSize(MEDIA_KINDS.IMAGE, resource.bytes, limits);
    return format;
}
