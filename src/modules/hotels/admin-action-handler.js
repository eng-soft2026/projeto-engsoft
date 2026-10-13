import { USER_ROLES } from "../../constants/user-roles.js";
import { readJsonBody } from "../../lib/request-body.js";
import { getRequestContext } from "../../lib/request-context.js";
import { parseRouteParams } from "../../lib/route-params.js";
import { jsonError, jsonSuccess } from "../../lib/route-response.js";
import { parseWithSchema } from "../../lib/validation.js";
import { hotelParamsSchema } from "../../schemas/hotel-schemas.js";
import { requireRole } from "../auth/guards.js";

export function createAdminHotelActionHandler({ schema, perform }) {
    return async function handleAdminHotelAction(request, context) {
        try {
            const admin = await requireRole([USER_ROLES.ADMIN]);
            const { id } = await parseRouteParams(context, hotelParamsSchema);
            const body = await readJsonBody(request);
            const input = parseWithSchema(schema, body);
            const hotel = await perform(
                admin,
                id,
                input,
                getRequestContext(request),
            );
            return jsonSuccess(hotel);
        } catch (error) {
            return jsonError(error);
        }
    };
}
