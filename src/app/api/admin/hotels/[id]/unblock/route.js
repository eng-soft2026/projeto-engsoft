import { createAdminHotelActionHandler } from "../../../../../../modules/hotels/admin-action-handler.js";
import { unblockHotelSchema } from "../../../../../../schemas/hotel-schemas.js";
import { hotelService } from "../../../../../../services/hotel-service.js";
import { withRequestLogging } from "../../../../../../lib/request-logging.js";

export const POST = withRequestLogging(
    "/api/admin/hotels/[id]/unblock",
    createAdminHotelActionHandler({
        schema: unblockHotelSchema,
        perform: hotelService.unblockHotel,
    }),
);
