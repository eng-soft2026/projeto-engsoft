import { createAdminHotelActionHandler } from "../../../../../../modules/hotels/admin-action-handler.js";
import { unblockHotelSchema } from "../../../../../../schemas/hotel-schemas.js";
import { hotelService } from "../../../../../../services/hotel-service.js";

export const POST = createAdminHotelActionHandler({
    schema: unblockHotelSchema,
    perform: hotelService.unblockHotel,
});
