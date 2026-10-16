import { USER_ROLES } from "../../../../../constants/user-roles.js";
import { readJsonBody } from "../../../../../lib/request-body.js";
import { parseRouteParams } from "../../../../../lib/route-params.js";
import { jsonError, jsonSuccess } from "../../../../../lib/route-response.js";
import { parseWithSchema } from "../../../../../lib/validation.js";
import { requireRole } from "../../../../../modules/auth/guards.js";
import {
    addHotelManagerSchema,
    hotelParamsSchema,
} from "../../../../../schemas/hotel-schemas.js";
import { hotelManagerService } from "../../../../../services/hotel-manager-service.js";

const CREATED_STATUS = 201;

export async function POST(request, context) {
    try {
        const owner = await requireRole([USER_ROLES.MANAGER]);
        const { id } = await parseRouteParams(context, hotelParamsSchema);
        const body = await readJsonBody(request);
        const input = parseWithSchema(addHotelManagerSchema, body);
        const manager = await hotelManagerService.addManager(owner, id, input);
        return jsonSuccess(manager, CREATED_STATUS);
    } catch (error) {
        return jsonError(error, request);
    }
}
