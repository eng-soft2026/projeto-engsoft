import { USER_ROLES } from "../../../constants/user-roles.js";
import { readJsonBody } from "../../../lib/request-body.js";
import { jsonError, jsonSuccess } from "../../../lib/route-response.js";
import { parseWithSchema } from "../../../lib/validation.js";
import { requireRole } from "../../../modules/auth/guards.js";
import { createHotelSchema } from "../../../schemas/hotel-schemas.js";
import { hotelService } from "../../../services/hotel-service.js";

const CREATED_STATUS = 201;

export async function GET() {
    try {
        const manager = await requireRole([USER_ROLES.MANAGER]);
        const hotels = await hotelService.listManagedHotels(manager);
        return jsonSuccess(hotels);
    } catch (error) {
        return jsonError(error);
    }
}

export async function POST(request) {
    try {
        const manager = await requireRole([USER_ROLES.MANAGER]);
        const body = await readJsonBody(request);
        const input = parseWithSchema(createHotelSchema, body);
        const hotel = await hotelService.createHotel(manager, input);
        return jsonSuccess(hotel, CREATED_STATUS);
    } catch (error) {
        return jsonError(error);
    }
}
