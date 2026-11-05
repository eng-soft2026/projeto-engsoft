import { AMENITY_TARGETS } from "../../../../../constants/amenity.js";
import { createAmenityAssociationHandlers } from "../../../../../modules/amenities/amenity-association-handler.js";
import { roomParamsSchema } from "../../../../../schemas/room-schemas.js";
import { withRequestLogging } from "../../../../../lib/request-logging.js";

const handlers = createAmenityAssociationHandlers(
    AMENITY_TARGETS.ROOM,
    roomParamsSchema,
);

export const GET = withRequestLogging(
    "/api/rooms/[id]/amenities",
    handlers.GET,
);
export const PUT = withRequestLogging(
    "/api/rooms/[id]/amenities",
    handlers.PUT,
);
