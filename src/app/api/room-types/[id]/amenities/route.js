import { AMENITY_TARGETS } from "../../../../../constants/amenity.js";
import { createAmenityAssociationHandlers } from "../../../../../modules/amenities/amenity-association-handler.js";
import { roomTypeParamsSchema } from "../../../../../schemas/room-type-schemas.js";
import { withRequestLogging } from "../../../../../lib/request-logging.js";

const handlers = createAmenityAssociationHandlers(
    AMENITY_TARGETS.ROOM_TYPE,
    roomTypeParamsSchema,
);

export const GET = withRequestLogging(
    "/api/room-types/[id]/amenities",
    handlers.GET,
);
export const PUT = withRequestLogging(
    "/api/room-types/[id]/amenities",
    handlers.PUT,
);
