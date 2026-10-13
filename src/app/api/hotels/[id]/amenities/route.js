import { AMENITY_TARGETS } from "../../../../../constants/amenity.js";
import { createAmenityAssociationHandlers } from "../../../../../modules/amenities/amenity-association-handler.js";
import { hotelParamsSchema } from "../../../../../schemas/hotel-schemas.js";

const handlers = createAmenityAssociationHandlers(
    AMENITY_TARGETS.HOTEL,
    hotelParamsSchema,
);

export const GET = handlers.GET;
export const PUT = handlers.PUT;
