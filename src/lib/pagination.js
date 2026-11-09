export function getSkipTake({ page, pageSize }) {
    const skip = (page - 1) * pageSize;
    if (!Number.isSafeInteger(skip)) {
        throw new RangeError(
            "O deslocamento da página excede o limite seguro.",
        );
    }

    return {
        skip,
        take: pageSize,
    };
}

export function buildPageMeta({ page, pageSize, total }) {
    return { page, pageSize, total };
}
