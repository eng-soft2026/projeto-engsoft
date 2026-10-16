import { AMENITY_TARGETS } from "../../../../../constants/amenity.js";
import { createAmenityAssociationHandlers } from "../../../../../modules/amenities/amenity-association-handler.js";
import { hotelParamsSchema } from "../../../../../schemas/hotel-schemas.js";
import { withRequestLogging } from "../../../../../lib/request-logging.js";

const handlers = createAmenityAssociationHandlers(
    AMENITY_TARGETS.HOTEL,
    hotelParamsSchema,
);

export const GET = withRequestLogging(
    "/api/hotels/[id]/amenities",
    handlers.GET,
);
export const PUT = withRequestLogging(
    "/api/hotels/[id]/amenities",
    handlers.PUT,
);
