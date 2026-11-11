import { USER_ROLES } from "../../../../../../constants/user-roles.js";
import { readJsonBody } from "../../../../../../lib/request-body.js";
import { withRequestLogging } from "../../../../../../lib/request-logging.js";
import { parseRouteParams } from "../../../../../../lib/route-params.js";
import {
    jsonError,
    jsonSuccess,
} from "../../../../../../lib/route-response.js";
import { parseWithSchema } from "../../../../../../lib/validation.js";
import { requireRole } from "../../../../../../modules/auth/guards.js";
import {
    roomTypeImageParamsSchema,
    updateRoomTypeImageSchema,
} from "../../../../../../schemas/hotel-image-schemas.js";
import { roomTypeImageService } from "../../../../../../services/room-type-image-service.js";

export const PATCH = withRequestLogging(
    "/api/room-types/[id]/images/[imageId]",
    async (request, context) => {
        try {
            const manager = await requireRole([USER_ROLES.MANAGER]);
            const { id, imageId } = await parseRouteParams(
                context,
                roomTypeImageParamsSchema,
            );
            const body = await readJsonBody(request);
            const changes = parseWithSchema(updateRoomTypeImageSchema, body);
            const image = await roomTypeImageService.updateImage(
                manager,
                id,
                imageId,
                changes,
            );
            return jsonSuccess(image);
        } catch (error) {
            return jsonError(error, request);
        }
    },
);

export const DELETE = withRequestLogging(
    "/api/room-types/[id]/images/[imageId]",
    async (request, context) => {
        try {
            const manager = await requireRole([USER_ROLES.MANAGER]);
            const { id, imageId } = await parseRouteParams(
                context,
                roomTypeImageParamsSchema,
            );
            const result = await roomTypeImageService.deleteImage(
                manager,
                id,
                imageId,
            );
            return jsonSuccess(result);
        } catch (error) {
            return jsonError(error, request);
        }
    },
);
