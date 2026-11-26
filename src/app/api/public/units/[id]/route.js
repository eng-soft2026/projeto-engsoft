import { parseRouteParams } from "../../../../../lib/route-params.js";
import { jsonError, jsonSuccess } from "../../../../../lib/route-response.js";
import { withRequestLogging } from "../../../../../lib/request-logging.js";
import { unitParamsSchema } from "../../../../../schemas/unit-schemas.js";
import { publicCatalogService } from "../../../../../services/public-catalog-service.js";

export const GET = withRequestLogging(
    "/api/public/units/[id]",
    async (request, context) => {
        try {
            const { id } = await parseRouteParams(context, unitParamsSchema);
            const unit = await publicCatalogService.getUnit(id);
            return jsonSuccess(unit);
        } catch (error) {
            return jsonError(error, request);
        }
    },
);
