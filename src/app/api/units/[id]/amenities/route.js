import { AMENITY_TARGETS } from "../../../../../constants/amenity.js";
import { createAmenityAssociationHandlers } from "../../../../../modules/amenities/amenity-association-handler.js";
import { unitParamsSchema } from "../../../../../schemas/unit-schemas.js";
import { withRequestLogging } from "../../../../../lib/request-logging.js";

const handlers = createAmenityAssociationHandlers(
    AMENITY_TARGETS.UNIT,
    unitParamsSchema,
);

export const GET = withRequestLogging(
    "/api/units/[id]/amenities",
    handlers.GET,
);
export const PUT = withRequestLogging(
    "/api/units/[id]/amenities",
    handlers.PUT,
);
