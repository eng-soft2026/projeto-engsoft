import { createAdminHotelActionHandler } from "../../../../../../modules/hotels/admin-action-handler.js";
import { hotelReviewActionSchema } from "../../../../../../schemas/hotel-schemas.js";
import { hotelService } from "../../../../../../services/hotel-service.js";

export const POST = createAdminHotelActionHandler({
    schema: hotelReviewActionSchema,
    perform: hotelService.approveHotel,
});
