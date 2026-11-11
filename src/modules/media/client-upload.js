import { MEDIA_FORMATS_BY_MIME_TYPE } from "../../constants/media.js";

const JPEG_MIME_TYPE = "image/jpeg";
const JPEG_EXTENSIONS = MEDIA_FORMATS_BY_MIME_TYPE[JPEG_MIME_TYPE].extensions;
const BYTES_PER_MEGABYTE = 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = [
    JPEG_MIME_TYPE,
    ...JPEG_EXTENSIONS.map((extension) => `.${extension}`),
].join(",");

export const INVALID_IMAGE_FORMAT_MESSAGE = "Envie uma foto em JPG ou JPEG.";

function readExtension(fileName) {
    const dotIndex = fileName.lastIndexOf(".");
    if (dotIndex < 0) {
        return "";
    }
    return fileName.slice(dotIndex + 1).toLowerCase();
}

export function formatMegabytes(bytes) {
    return Math.floor(bytes / BYTES_PER_MEGABYTE);
}

export function formatImageTooLargeMessage(maxBytes) {
    return `A foto deve ter no máximo ${formatMegabytes(maxBytes)} MB.`;
}

export function formatImageLimitMessage(maxImages, ownerLabel) {
    return `A galeria ${ownerLabel} aceita no máximo ${maxImages} fotos.`;
}

export function validateImageFile(file, maxBytes) {
    const isJpeg =
        file.type?.toLowerCase() === JPEG_MIME_TYPE &&
        JPEG_EXTENSIONS.includes(readExtension(file.name ?? ""));
    if (!isJpeg) {
        return INVALID_IMAGE_FORMAT_MESSAGE;
    }
    if (file.size <= 0 || file.size > maxBytes) {
        return formatImageTooLargeMessage(maxBytes);
    }
    return null;
}

export function countRemainingSlots(maxImages, usedCount) {
    if (maxImages === null) {
        return Number.POSITIVE_INFINITY;
    }
    return Math.max(maxImages - usedCount, 0);
}

export function selectFilesToUpload(files, { maxBytes, maxImages, usedCount }) {
    const accepted = [];
    const rejected = [];
    let remainingSlots = countRemainingSlots(maxImages, usedCount);
    let hasReachedLimit = false;

    for (const file of files) {
        const error = validateImageFile(file, maxBytes);
        if (error) {
            rejected.push({ file, error });
            continue;
        }
        if (remainingSlots === 0) {
            hasReachedLimit = true;
            continue;
        }
        accepted.push(file);
        remainingSlots -= 1;
    }
    return { accepted, rejected, hasReachedLimit };
}
