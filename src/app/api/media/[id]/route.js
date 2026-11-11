import { USER_ROLES } from "../../../../constants/user-roles.js";
import { withRequestLogging } from "../../../../lib/request-logging.js";
import { parseRouteParams } from "../../../../lib/route-params.js";
import { jsonError, jsonSuccess } from "../../../../lib/route-response.js";
import { parseWithSchema } from "../../../../lib/validation.js";
import { requireRole } from "../../../../modules/auth/guards.js";
import { mediaService } from "../../../../modules/media/media-service.js";
import {
    mediaParamsSchema,
    mediaTargetQuerySchema,
} from "../../../../schemas/media-schemas.js";

function readSearchParams(request) {
    return Object.fromEntries(new URL(request.url).searchParams);
}

export const DELETE = withRequestLogging(
    "/api/media/[id]",
    async (request, context) => {
        try {
            const manager = await requireRole([USER_ROLES.MANAGER]);
            const { id } = await parseRouteParams(context, mediaParamsSchema);
            const target = parseWithSchema(
                mediaTargetQuerySchema,
                readSearchParams(request),
            );
            const result = await mediaService.deleteAsset(manager, {
                assetId: id,
                ...target,
            });
            return jsonSuccess(result);
        } catch (error) {
            return jsonError(error, request);
        }
    },
);
