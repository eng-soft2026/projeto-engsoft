export const BYTES_PER_MEGABYTE = 1024 * 1024;

export const MEDIA_LIMIT_CEILINGS = Object.freeze({
    maxImageUploadMb: 50,
    maxVideoUploadMb: 50,
    maxReviewVideoSeconds: 10,
});

export const DEFAULT_MEDIA_LIMITS = Object.freeze({
    maxImageUploadMb: 10,
    maxVideoUploadMb: 50,
    maxReviewVideoSeconds: 10,
});

function readPositiveInteger(value) {
    if (typeof value !== "string" || !/^\d+$/.test(value.trim())) {
        return null;
    }
    const parsed = Number.parseInt(value, 10);
    return parsed > 0 ? parsed : null;
}

function resolveLimit(value, key) {
    const parsed = readPositiveInteger(value) ?? DEFAULT_MEDIA_LIMITS[key];
    return Math.min(parsed, MEDIA_LIMIT_CEILINGS[key]);
}

export function getMediaLimits(env = process.env) {
    const maxImageUploadMb = resolveLimit(
        env.MAX_IMAGE_UPLOAD_MB,
        "maxImageUploadMb",
    );
    const maxVideoUploadMb = resolveLimit(
        env.MAX_VIDEO_UPLOAD_MB,
        "maxVideoUploadMb",
    );
    const maxReviewVideoSeconds = resolveLimit(
        env.MAX_REVIEW_VIDEO_SECONDS,
        "maxReviewVideoSeconds",
    );
    return Object.freeze({
        maxImageUploadMb,
        maxVideoUploadMb,
        maxReviewVideoSeconds,
        maxImageBytes: maxImageUploadMb * BYTES_PER_MEGABYTE,
        maxVideoBytes: maxVideoUploadMb * BYTES_PER_MEGABYTE,
    });
}
