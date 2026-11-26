import { parseRouteParams } from "../../../../../lib/route-params.js";
import { jsonError, jsonSuccess } from "../../../../../lib/route-response.js";
import { withRequestLogging } from "../../../../../lib/request-logging.js";
import { roomParamsSchema } from "../../../../../schemas/room-schemas.js";
import { publicCatalogService } from "../../../../../services/public-catalog-service.js";

export const GET = withRequestLogging(
    "/api/public/rooms/[id]",
    async (request, context) => {
        try {
            const { id } = await parseRouteParams(context, roomParamsSchema);
            const room = await publicCatalogService.getRoom(id);
            return jsonSuccess(room);
        } catch (error) {
            return jsonError(error, request);
        }
    },
);
