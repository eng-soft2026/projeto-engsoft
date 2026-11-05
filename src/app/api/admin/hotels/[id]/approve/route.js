import { createAdminHotelActionHandler } from "../../../../../../modules/hotels/admin-action-handler.js";
import { hotelReviewActionSchema } from "../../../../../../schemas/hotel-schemas.js";
import { hotelService } from "../../../../../../services/hotel-service.js";
import { withRequestLogging } from "../../../../../../lib/request-logging.js";

export const POST = withRequestLogging(
    "/api/admin/hotels/[id]/approve",
    createAdminHotelActionHandler({
        schema: hotelReviewActionSchema,
        perform: hotelService.approveHotel,
    }),
);
