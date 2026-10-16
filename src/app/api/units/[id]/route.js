import { USER_ROLES } from "../../../../constants/user-roles.js";
import { readJsonBody } from "../../../../lib/request-body.js";
import { parseRouteParams } from "../../../../lib/route-params.js";
import { jsonError, jsonSuccess } from "../../../../lib/route-response.js";
import { parseWithSchema } from "../../../../lib/validation.js";
import { requireRole } from "../../../../modules/auth/guards.js";
import {
    unitParamsSchema,
    updateUnitSchema,
} from "../../../../schemas/unit-schemas.js";
import { unitService } from "../../../../services/unit-service.js";

export async function GET(request, context) {
    try {
        const user = await requireRole([USER_ROLES.MANAGER, USER_ROLES.ADMIN]);
        const { id } = await parseRouteParams(context, unitParamsSchema);
        const unit = await unitService.getUnit(user, id);
        return jsonSuccess(unit);
    } catch (error) {
        return jsonError(error, request);
    }
}

export async function PATCH(request, context) {
    try {
        const manager = await requireRole([USER_ROLES.MANAGER]);
        const { id } = await parseRouteParams(context, unitParamsSchema);
        const body = await readJsonBody(request);
        const changes = parseWithSchema(updateUnitSchema, body);
        const unit = await unitService.updateUnit(manager, id, changes);
        return jsonSuccess(unit);
    } catch (error) {
        return jsonError(error, request);
    }
}
