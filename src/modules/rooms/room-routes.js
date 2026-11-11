import { buildManagedHotelHref } from "../hotels/managed-hotel-routes.js";

const ROOMS_SEGMENT = "rooms";

function buildQuery(entries) {
    const params = new URLSearchParams();
    for (const [key, value] of entries) {
        if (value) {
            params.set(key, String(value));
        }
    }
    const query = params.toString();
    return query ? `?${query}` : "";
}

export function buildRoomsHref(hotelId, { unitId, page } = {}) {
    const roomsHref = buildManagedHotelHref(hotelId, ROOMS_SEGMENT);
    return `${roomsHref}${buildQuery([
        ["unit", unitId],
        ["page", page],
    ])}`;
}

export function buildNewRoomHref(hotelId, unitId) {
    const roomsHref = buildManagedHotelHref(hotelId, ROOMS_SEGMENT);
    return `${roomsHref}/new${buildQuery([["unit", unitId]])}`;
}

export function buildRoomHref(hotelId, roomId) {
    return `${buildManagedHotelHref(hotelId, ROOMS_SEGMENT)}/${roomId}`;
}
