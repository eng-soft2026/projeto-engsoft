import { buildManagedHotelHref } from "../hotels/managed-hotel-routes.js";

const ROOM_TYPES_SEGMENT = "room-types";

export function buildRoomTypesHref(hotelId, page) {
    const roomTypesHref = buildManagedHotelHref(hotelId, ROOM_TYPES_SEGMENT);
    if (!page) {
        return roomTypesHref;
    }
    return `${roomTypesHref}?page=${page}`;
}

export function buildNewRoomTypeHref(hotelId) {
    return `${buildRoomTypesHref(hotelId)}/new`;
}

export function buildRoomTypeHref(hotelId, roomTypeId) {
    return `${buildRoomTypesHref(hotelId)}/${roomTypeId}`;
}
