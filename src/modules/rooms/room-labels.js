import {
    MANUAL_ROOM_STATUSES,
    ROOM_STATUSES,
} from "../../constants/room-statuses.js";

export const ROOM_STATUS_LABELS = Object.freeze({
    [ROOM_STATUSES.AVAILABLE]: "Disponível",
    [ROOM_STATUSES.UNAVAILABLE]: "Indisponível",
    [ROOM_STATUSES.MAINTENANCE]: "Em manutenção",
    [ROOM_STATUSES.BLOCKED]: "Bloqueado",
    [ROOM_STATUSES.INACTIVE]: "Inativo",
});

const ROOM_STATUS_TONES = Object.freeze({
    [ROOM_STATUSES.AVAILABLE]: "success",
    [ROOM_STATUSES.UNAVAILABLE]: "neutral",
    [ROOM_STATUSES.MAINTENANCE]: "warning",
    [ROOM_STATUSES.BLOCKED]: "danger",
    [ROOM_STATUSES.INACTIVE]: "warning",
});

export const MANUAL_ROOM_STATUS_OPTIONS = Object.freeze(
    MANUAL_ROOM_STATUSES.map((status) =>
        Object.freeze({ value: status, label: ROOM_STATUS_LABELS[status] }),
    ),
);

export function getRoomStatusLabel(status) {
    return ROOM_STATUS_LABELS[status] ?? status;
}

export function getRoomStatusTone(status) {
    return ROOM_STATUS_TONES[status] ?? "neutral";
}

export function formatFloor(floor) {
    if (floor === 0) {
        return "Térreo";
    }
    return `${floor}º andar`;
}
