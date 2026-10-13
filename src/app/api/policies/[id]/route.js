import { USER_ROLES } from "../../../../constants/user-roles.js";
import { readJsonBody } from "../../../../lib/request-body.js";
import { parseRouteParams } from "../../../../lib/route-params.js";
import { jsonError, jsonSuccess } from "../../../../lib/route-response.js";
import { parseWithSchema } from "../../../../lib/validation.js";
import { requireRole } from "../../../../modules/auth/guards.js";
import {
    policyParamsSchema,
    updatePolicySchema,
} from "../../../../schemas/policy-schemas.js";
import { policyService } from "../../../../services/policy-service.js";

export async function GET(request, context) {
    try {
        const user = await requireRole([USER_ROLES.MANAGER, USER_ROLES.ADMIN]);
        const { id } = await parseRouteParams(context, policyParamsSchema);
        const policy = await policyService.getPolicy(user, id);
        return jsonSuccess(policy);
    } catch (error) {
        return jsonError(error);
    }
}

export async function PATCH(request, context) {
    try {
        const manager = await requireRole([USER_ROLES.MANAGER]);
        const { id } = await parseRouteParams(context, policyParamsSchema);
        const body = await readJsonBody(request);
        const changes = parseWithSchema(updatePolicySchema, body);
        const policy = await policyService.updatePolicy(manager, id, changes);
        return jsonSuccess(policy);
    } catch (error) {
        return jsonError(error);
    }
}
