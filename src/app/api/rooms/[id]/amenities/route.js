import { AMENITY_TARGETS } from "../../../../../constants/amenity.js";
import { createAmenityAssociationHandlers } from "../../../../../modules/amenities/amenity-association-handler.js";
import { roomParamsSchema } from "../../../../../schemas/room-schemas.js";

const handlers = createAmenityAssociationHandlers(
    AMENITY_TARGETS.ROOM,
    roomParamsSchema,
);

export const GET = handlers.GET;
export const PUT = handlers.PUT;
