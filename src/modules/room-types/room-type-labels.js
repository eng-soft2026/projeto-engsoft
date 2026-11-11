import { BED_TYPES } from "../../constants/bed-types.js";

export const BED_TYPE_LABELS = Object.freeze({
    [BED_TYPES.SINGLE]: "Solteiro",
    [BED_TYPES.DOUBLE]: "Casal",
    [BED_TYPES.QUEEN]: "Queen",
    [BED_TYPES.KING]: "King",
    [BED_TYPES.SOFA_BED]: "Sofá-cama",
});

export const BED_TYPE_OPTIONS = Object.freeze(
    Object.values(BED_TYPES).map((bedType) =>
        Object.freeze({ value: bedType, label: BED_TYPE_LABELS[bedType] }),
    ),
);

const THOUSANDS_PATTERN = /\B(?=(\d{3})+(?!\d))/g;

export function formatDecimalForDisplay(value) {
    const [integerPart, fractionPart] = String(value).split(".");
    const groupedInteger = integerPart.replace(THOUSANDS_PATTERN, ".");
    if (fractionPart === undefined) {
        return groupedInteger;
    }
    return `${groupedInteger},${fractionPart}`;
}

export function formatPrice(value) {
    return `R$ ${formatDecimalForDisplay(value)}`;
}

export function formatArea(value) {
    return `${formatDecimalForDisplay(value)} m²`;
}

export function formatBeds(beds) {
    return beds
        .map(
            ({ bedType, quantity }) =>
                `${quantity}× ${BED_TYPE_LABELS[bedType] ?? bedType}`,
        )
        .join(", ");
}
