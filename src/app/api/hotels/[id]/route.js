import { USER_ROLES } from "../../../../constants/user-roles.js";
import { readJsonBody } from "../../../../lib/request-body.js";
import { parseRouteParams } from "../../../../lib/route-params.js";
import { jsonError, jsonSuccess } from "../../../../lib/route-response.js";
import { parseWithSchema } from "../../../../lib/validation.js";
import { requireRole } from "../../../../modules/auth/guards.js";
import {
    hotelParamsSchema,
    updateHotelSchema,
} from "../../../../schemas/hotel-schemas.js";
import { hotelService } from "../../../../services/hotel-service.js";

export async function GET(request, context) {
    try {
        const user = await requireRole([USER_ROLES.MANAGER, USER_ROLES.ADMIN]);
        const { id } = await parseRouteParams(context, hotelParamsSchema);
        const hotel = await hotelService.getHotel(user, id);
        return jsonSuccess(hotel);
    } catch (error) {
        return jsonError(error, request);
    }
}

export async function PATCH(request, context) {
    try {
        const manager = await requireRole([USER_ROLES.MANAGER]);
        const { id } = await parseRouteParams(context, hotelParamsSchema);
        const body = await readJsonBody(request);
        const changes = parseWithSchema(updateHotelSchema, body);
        const hotel = await hotelService.updateHotel(manager, id, changes);
        return jsonSuccess(hotel);
    } catch (error) {
        return jsonError(error, request);
    }
}
