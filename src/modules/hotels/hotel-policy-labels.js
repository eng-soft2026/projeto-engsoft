import { HOTEL_POLICY_TYPES } from "../../constants/hotel-policy-types.js";

export const HOTEL_POLICY_TYPE_LABELS = Object.freeze({
    [HOTEL_POLICY_TYPES.CANCELLATION]: "Cancelamento",
    [HOTEL_POLICY_TYPES.QUIET_HOURS]: "Horário de silêncio",
    [HOTEL_POLICY_TYPES.PARKING]: "Estacionamento",
    [HOTEL_POLICY_TYPES.OTHER]: "Outra",
});

export const HOTEL_POLICY_TYPE_OPTIONS = Object.freeze(
    Object.values(HOTEL_POLICY_TYPES).map((type) =>
        Object.freeze({ value: type, label: HOTEL_POLICY_TYPE_LABELS[type] }),
    ),
);

export function getHotelPolicyTypeLabel(type) {
    return HOTEL_POLICY_TYPE_LABELS[type] ?? type;
}
