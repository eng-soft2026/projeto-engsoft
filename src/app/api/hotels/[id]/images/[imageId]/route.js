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
    hotelImageParamsSchema,
    updateHotelImageSchema,
} from "../../../../../../schemas/hotel-image-schemas.js";
import { hotelImageService } from "../../../../../../services/hotel-image-service.js";

export const PATCH = withRequestLogging(
    "/api/hotels/[id]/images/[imageId]",
    async (request, context) => {
        try {
            const manager = await requireRole([USER_ROLES.MANAGER]);
            const { id, imageId } = await parseRouteParams(
                context,
                hotelImageParamsSchema,
            );
            const body = await readJsonBody(request);
            const changes = parseWithSchema(updateHotelImageSchema, body);
            const image = await hotelImageService.updateImage(
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
    "/api/hotels/[id]/images/[imageId]",
    async (request, context) => {
        try {
            const manager = await requireRole([USER_ROLES.MANAGER]);
            const { id, imageId } = await parseRouteParams(
                context,
                hotelImageParamsSchema,
            );
            const result = await hotelImageService.deleteImage(
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
