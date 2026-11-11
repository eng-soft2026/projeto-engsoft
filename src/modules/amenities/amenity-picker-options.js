import { AMENITY_TARGETS } from "../../constants/amenity.js";

const TARGET_PATH_SEGMENTS = Object.freeze({
    [AMENITY_TARGETS.HOTEL]: "hotels",
    [AMENITY_TARGETS.UNIT]: "units",
    [AMENITY_TARGETS.ROOM_TYPE]: "room-types",
    [AMENITY_TARGETS.ROOM]: "rooms",
});

const SORT_LOCALE = "pt-BR";

export function buildAmenityTargetPath(target, targetId) {
    const segment = TARGET_PATH_SEGMENTS[target];
    if (!segment) {
        throw new TypeError(`Unknown amenity target: ${target}`);
    }
    return `/api/${segment}/${encodeURIComponent(targetId)}/amenities`;
}

export function toPickerAmenity({ id, name, isGlobal, isActive }) {
    return { id, name, isGlobal, isActive };
}

export function sortAmenitiesByName(amenities) {
    return [...amenities].sort((first, second) =>
        first.name.localeCompare(second.name, SORT_LOCALE, {
            sensitivity: "base",
        }),
    );
}

export function mergeAmenityOptions(available, selected) {
    const byId = new Map();
    for (const amenity of [...available, ...selected]) {
        byId.set(amenity.id, toPickerAmenity(amenity));
    }
    return sortAmenitiesByName([...byId.values()]);
}

function normalizeSearchText(text) {
    return text
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLocaleLowerCase(SORT_LOCALE)
        .trim();
}

export function filterAmenitiesByName(amenities, query) {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) {
        return amenities;
    }
    return amenities.filter(({ name }) =>
        normalizeSearchText(name).includes(normalizedQuery),
    );
}
