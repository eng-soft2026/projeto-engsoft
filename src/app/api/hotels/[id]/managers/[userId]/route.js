import { USER_ROLES } from "../../../../../../constants/user-roles.js";
import { parseRouteParams } from "../../../../../../lib/route-params.js";
import {
    jsonError,
    jsonSuccess,
} from "../../../../../../lib/route-response.js";
import { requireRole } from "../../../../../../modules/auth/guards.js";
import { hotelManagerParamsSchema } from "../../../../../../schemas/hotel-schemas.js";
import { hotelManagerService } from "../../../../../../services/hotel-manager-service.js";

export async function DELETE(request, context) {
    try {
        const owner = await requireRole([USER_ROLES.MANAGER]);
        const { id, userId } = await parseRouteParams(
            context,
            hotelManagerParamsSchema,
        );
        await hotelManagerService.removeManager(owner, id, userId);
        return jsonSuccess({ removed: true });
    } catch (error) {
        return jsonError(error, request);
    }
}
