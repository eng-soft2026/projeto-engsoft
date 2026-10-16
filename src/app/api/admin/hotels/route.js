import { USER_ROLES } from "../../../../constants/user-roles.js";
import { jsonError, jsonSuccess } from "../../../../lib/route-response.js";
import { parseWithSchema } from "../../../../lib/validation.js";
import { requireRole } from "../../../../modules/auth/guards.js";
import { listHotelsQuerySchema } from "../../../../schemas/hotel-schemas.js";
import { hotelService } from "../../../../services/hotel-service.js";
import { withRequestLogging } from "../../../../lib/request-logging.js";

export const GET = withRequestLogging("/api/admin/hotels", async (request) => {
    try {
        const admin = await requireRole([USER_ROLES.ADMIN]);
        const { searchParams } = new URL(request.url);
        const query = parseWithSchema(
            listHotelsQuerySchema,
            Object.fromEntries(searchParams),
        );
        const hotels = await hotelService.listHotelsForReview(admin, query);
        return jsonSuccess(hotels);
    } catch (error) {
        return jsonError(error, request);
    }
});
