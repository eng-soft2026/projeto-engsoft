import { HOTEL_STATUSES } from "../../constants/hotel-statuses.js";

export const HOTEL_STATUS_LABELS = Object.freeze({
    [HOTEL_STATUSES.DRAFT]: "Rascunho",
    [HOTEL_STATUSES.UNDER_REVIEW]: "Em análise",
    [HOTEL_STATUSES.PUBLISHED]: "Publicado",
    [HOTEL_STATUSES.BLOCKED]: "Bloqueado",
});

export const HOTEL_STATUS_TONES = Object.freeze({
    [HOTEL_STATUSES.DRAFT]: "neutral",
    [HOTEL_STATUSES.UNDER_REVIEW]: "warning",
    [HOTEL_STATUSES.PUBLISHED]: "success",
    [HOTEL_STATUSES.BLOCKED]: "danger",
});

export function getHotelStatusLabel(status) {
    return HOTEL_STATUS_LABELS[status] ?? status;
}

export function getHotelStatusTone(status) {
    return HOTEL_STATUS_TONES[status] ?? "neutral";
}
