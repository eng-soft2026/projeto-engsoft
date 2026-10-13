import { AMENITY_TARGETS } from "../../../../../constants/amenity.js";
import { createAmenityAssociationHandlers } from "../../../../../modules/amenities/amenity-association-handler.js";
import { unitParamsSchema } from "../../../../../schemas/unit-schemas.js";

const handlers = createAmenityAssociationHandlers(
    AMENITY_TARGETS.UNIT,
    unitParamsSchema,
);

export const GET = handlers.GET;
export const PUT = handlers.PUT;
