import { USER_ROLES } from "../../../../../constants/user-roles.js";
import { readJsonBody } from "../../../../../lib/request-body.js";
import { parseRouteParams } from "../../../../../lib/route-params.js";
import { jsonError, jsonSuccess } from "../../../../../lib/route-response.js";
import { parseWithSchema } from "../../../../../lib/validation.js";
import { requireRole } from "../../../../../modules/auth/guards.js";
import { hotelParamsSchema } from "../../../../../schemas/hotel-schemas.js";
import { createRoomTypeSchema } from "../../../../../schemas/room-type-schemas.js";
import { roomTypeService } from "../../../../../services/room-type-service.js";

const CREATED_STATUS = 201;

export async function GET(request, context) {
    try {
        const user = await requireRole([USER_ROLES.MANAGER, USER_ROLES.ADMIN]);
        const { id } = await parseRouteParams(context, hotelParamsSchema);
        const roomTypes = await roomTypeService.listRoomTypes(user, id);
        return jsonSuccess(roomTypes);
    } catch (error) {
        return jsonError(error, request);
    }
}

export async function POST(request, context) {
    try {
        const manager = await requireRole([USER_ROLES.MANAGER]);
        const { id } = await parseRouteParams(context, hotelParamsSchema);
        const body = await readJsonBody(request);
        const input = parseWithSchema(createRoomTypeSchema, body);
        const roomType = await roomTypeService.createRoomType(
            manager,
            id,
            input,
        );
        return jsonSuccess(roomType, CREATED_STATUS);
    } catch (error) {
        return jsonError(error, request);
    }
}
