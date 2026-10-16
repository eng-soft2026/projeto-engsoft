import { USER_ROLES } from "../../../../../constants/user-roles.js";
import { readJsonBody } from "../../../../../lib/request-body.js";
import { parseRouteParams } from "../../../../../lib/route-params.js";
import { jsonError, jsonSuccess } from "../../../../../lib/route-response.js";
import { parseWithSchema } from "../../../../../lib/validation.js";
import { requireRole } from "../../../../../modules/auth/guards.js";
import { hotelParamsSchema } from "../../../../../schemas/hotel-schemas.js";
import { createPolicySchema } from "../../../../../schemas/policy-schemas.js";
import { policyService } from "../../../../../services/policy-service.js";

const CREATED_STATUS = 201;

export async function GET(request, context) {
    try {
        const user = await requireRole([USER_ROLES.MANAGER, USER_ROLES.ADMIN]);
        const { id } = await parseRouteParams(context, hotelParamsSchema);
        const policies = await policyService.listPolicies(user, id);
        return jsonSuccess(policies);
    } catch (error) {
        return jsonError(error, request);
    }
}

export async function POST(request, context) {
    try {
        const manager = await requireRole([USER_ROLES.MANAGER]);
        const { id } = await parseRouteParams(context, hotelParamsSchema);
        const body = await readJsonBody(request);
        const input = parseWithSchema(createPolicySchema, body);
        const policy = await policyService.createPolicy(manager, id, input);
        return jsonSuccess(policy, CREATED_STATUS);
    } catch (error) {
        return jsonError(error, request);
    }
}
