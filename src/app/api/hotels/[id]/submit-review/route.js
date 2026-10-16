import { USER_ROLES } from "../../../../../constants/user-roles.js";
import { parseRouteParams } from "../../../../../lib/route-params.js";
import { jsonError, jsonSuccess } from "../../../../../lib/route-response.js";
import { requireRole } from "../../../../../modules/auth/guards.js";
import { hotelParamsSchema } from "../../../../../schemas/hotel-schemas.js";
import { hotelService } from "../../../../../services/hotel-service.js";

export async function POST(request, context) {
    try {
        const manager = await requireRole([USER_ROLES.MANAGER]);
        const { id } = await parseRouteParams(context, hotelParamsSchema);
        const hotel = await hotelService.submitForReview(manager, id);
        return jsonSuccess(hotel);
    } catch (error) {
        return jsonError(error, request);
    }
}
