import { AMENITY_TARGETS } from "../../../../../constants/amenity.js";
import { createAmenityAssociationHandlers } from "../../../../../modules/amenities/amenity-association-handler.js";
import { roomTypeParamsSchema } from "../../../../../schemas/room-type-schemas.js";

const handlers = createAmenityAssociationHandlers(
    AMENITY_TARGETS.ROOM_TYPE,
    roomTypeParamsSchema,
);

export const GET = handlers.GET;
export const PUT = handlers.PUT;
