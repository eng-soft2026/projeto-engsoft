import { parseRouteParams } from "../../../../../lib/route-params.js";
import { jsonError, jsonSuccess } from "../../../../../lib/route-response.js";
import { withRequestLogging } from "../../../../../lib/request-logging.js";
import { hotelParamsSchema } from "../../../../../schemas/hotel-schemas.js";
import { publicCatalogService } from "../../../../../services/public-catalog-service.js";

export const GET = withRequestLogging(
    "/api/public/hotels/[id]",
    async (request, context) => {
        try {
            const { id } = await parseRouteParams(context, hotelParamsSchema);
            const hotel = await publicCatalogService.getHotel(id);
            return jsonSuccess(hotel);
        } catch (error) {
            return jsonError(error, request);
        }
    },
);
