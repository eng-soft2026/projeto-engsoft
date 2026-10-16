import { USER_ROLES } from "../../../../../constants/user-roles.js";
import { readJsonBody } from "../../../../../lib/request-body.js";
import { parseRouteParams } from "../../../../../lib/route-params.js";
import { jsonError, jsonSuccess } from "../../../../../lib/route-response.js";
import { parseWithSchema } from "../../../../../lib/validation.js";
import { requireRole } from "../../../../../modules/auth/guards.js";
import { replaceAcceptancesSchema } from "../../../../../schemas/acceptance-schemas.js";
import { hotelParamsSchema } from "../../../../../schemas/hotel-schemas.js";
import { acceptanceService } from "../../../../../services/acceptance-service.js";

export async function GET(request, context) {
    try {
        const user = await requireRole([USER_ROLES.MANAGER, USER_ROLES.ADMIN]);
        const { id } = await parseRouteParams(context, hotelParamsSchema);
        const acceptances = await acceptanceService.listAcceptances(user, id);
        return jsonSuccess(acceptances);
    } catch (error) {
        return jsonError(error, request);
    }
}

export async function PUT(request, context) {
    try {
        const manager = await requireRole([USER_ROLES.MANAGER]);
        const { id } = await parseRouteParams(context, hotelParamsSchema);
        const body = await readJsonBody(request);
        const input = parseWithSchema(replaceAcceptancesSchema, body);
        const acceptances = await acceptanceService.replaceAcceptances(
            manager,
            id,
            input,
        );
        return jsonSuccess(acceptances);
    } catch (error) {
        return jsonError(error, request);
    }
}
