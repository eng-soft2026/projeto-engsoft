import { USER_ROLES } from "../../../../../constants/user-roles.js";
import { readJsonBody } from "../../../../../lib/request-body.js";
import { withRequestLogging } from "../../../../../lib/request-logging.js";
import { parseRouteParams } from "../../../../../lib/route-params.js";
import { jsonError, jsonSuccess } from "../../../../../lib/route-response.js";
import { parseWithSchema } from "../../../../../lib/validation.js";
import { requireRole } from "../../../../../modules/auth/guards.js";
import {
    unitLocationSchema,
    unitParamsSchema,
} from "../../../../../schemas/unit-schemas.js";
import { unitService } from "../../../../../services/unit-service.js";

export const PATCH = withRequestLogging(
    "/api/units/[id]/location",
    async (request, context) => {
        try {
            const manager = await requireRole([USER_ROLES.MANAGER]);
            const { id } = await parseRouteParams(context, unitParamsSchema);
            const body = await readJsonBody(request);
            const coordinates = parseWithSchema(unitLocationSchema, body);
            const unit = await unitService.updateUnitLocation(
                manager,
                id,
                coordinates,
            );
            return jsonSuccess(unit);
        } catch (error) {
            return jsonError(error, request);
        }
    },
);
