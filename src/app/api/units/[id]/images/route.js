import { USER_ROLES } from "../../../../../constants/user-roles.js";
import { readJsonBody } from "../../../../../lib/request-body.js";
import { withRequestLogging } from "../../../../../lib/request-logging.js";
import { parseRouteParams } from "../../../../../lib/route-params.js";
import { jsonError, jsonSuccess } from "../../../../../lib/route-response.js";
import { parseWithSchema } from "../../../../../lib/validation.js";
import { requireRole } from "../../../../../modules/auth/guards.js";
import { createUnitImageSchema } from "../../../../../schemas/hotel-image-schemas.js";
import { unitParamsSchema } from "../../../../../schemas/unit-schemas.js";
import { unitImageService } from "../../../../../services/unit-image-service.js";

const CREATED_STATUS = 201;

export const GET = withRequestLogging(
    "/api/units/[id]/images",
    async (request, context) => {
        try {
            const user = await requireRole([
                USER_ROLES.MANAGER,
                USER_ROLES.ADMIN,
            ]);
            const { id } = await parseRouteParams(context, unitParamsSchema);
            const images = await unitImageService.listImages(user, id);
            return jsonSuccess(images);
        } catch (error) {
            return jsonError(error, request);
        }
    },
);

export const POST = withRequestLogging(
    "/api/units/[id]/images",
    async (request, context) => {
        try {
            const manager = await requireRole([USER_ROLES.MANAGER]);
            const { id } = await parseRouteParams(context, unitParamsSchema);
            const body = await readJsonBody(request);
            const input = parseWithSchema(createUnitImageSchema, body);
            const image = await unitImageService.addImage(manager, id, input);
            return jsonSuccess(image, CREATED_STATUS);
        } catch (error) {
            return jsonError(error, request);
        }
    },
);
