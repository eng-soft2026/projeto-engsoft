import { MAX_PAGE_SIZE } from "../../../../../../constants/pagination.js";
import { buildRoomTypeOptions } from "../../../../../../modules/rooms/room-form.js";
import { roomTypeService } from "../../../../../../services/room-type-service.js";

const ALL_ROOM_TYPES_PAGE = Object.freeze({
    page: 1,
    pageSize: MAX_PAGE_SIZE,
});

export async function loadRoomTypeOptions(manager, hotelId, currentRoomTypeId) {
    const { items } = await roomTypeService.listRoomTypes(
        manager,
        hotelId,
        ALL_ROOM_TYPES_PAGE,
    );
    return buildRoomTypeOptions(items, currentRoomTypeId);
}
