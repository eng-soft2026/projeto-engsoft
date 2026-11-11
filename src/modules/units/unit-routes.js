import { buildManagedHotelHref } from "../hotels/managed-hotel-routes.js";

const UNITS_SEGMENT = "units";

export function buildUnitsHref(hotelId, page) {
    const unitsHref = buildManagedHotelHref(hotelId, UNITS_SEGMENT);
    if (!page) {
        return unitsHref;
    }
    return `${unitsHref}?page=${page}`;
}

export function buildNewUnitHref(hotelId) {
    return `${buildUnitsHref(hotelId)}/new`;
}

export function buildUnitHref(hotelId, unitId) {
    return `${buildUnitsHref(hotelId)}/${unitId}`;
}
