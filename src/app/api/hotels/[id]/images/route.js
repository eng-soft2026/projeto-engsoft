import { USER_ROLES } from "../../../../../constants/user-roles.js";
import { readJsonBody } from "../../../../../lib/request-body.js";
import { withRequestLogging } from "../../../../../lib/request-logging.js";
import { parseRouteParams } from "../../../../../lib/route-params.js";
import { jsonError, jsonSuccess } from "../../../../../lib/route-response.js";
import { parseWithSchema } from "../../../../../lib/validation.js";
import { requireRole } from "../../../../../modules/auth/guards.js";
import { createHotelImageSchema } from "../../../../../schemas/hotel-image-schemas.js";
import { hotelParamsSchema } from "../../../../../schemas/hotel-schemas.js";
import { hotelImageService } from "../../../../../services/hotel-image-service.js";

const CREATED_STATUS = 201;

export const GET = withRequestLogging(
    "/api/hotels/[id]/images",
    async (request, context) => {
        try {
            const user = await requireRole([
                USER_ROLES.MANAGER,
                USER_ROLES.ADMIN,
            ]);
            const { id } = await parseRouteParams(context, hotelParamsSchema);
            const images = await hotelImageService.listImages(user, id);
            return jsonSuccess(images);
        } catch (error) {
            return jsonError(error, request);
        }
    },
);

export const POST = withRequestLogging(
    "/api/hotels/[id]/images",
    async (request, context) => {
        try {
            const manager = await requireRole([USER_ROLES.MANAGER]);
            const { id } = await parseRouteParams(context, hotelParamsSchema);
            const body = await readJsonBody(request);
            const input = parseWithSchema(createHotelImageSchema, body);
            const image = await hotelImageService.addImage(manager, id, input);
            return jsonSuccess(image, CREATED_STATUS);
        } catch (error) {
            return jsonError(error, request);
        }
    },
);
