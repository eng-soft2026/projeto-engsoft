import { USER_ROLES } from "../../../constants/user-roles.js";
import { readJsonBody } from "../../../lib/request-body.js";
import { jsonError, jsonSuccess } from "../../../lib/route-response.js";
import { parseWithSchema } from "../../../lib/validation.js";
import { requireRole } from "../../../modules/auth/guards.js";
import { createAmenitySchema } from "../../../schemas/amenity-schemas.js";
import { paginationQuerySchema } from "../../../schemas/pagination.js";
import { amenityService } from "../../../services/amenity-service.js";
import { withRequestLogging } from "../../../lib/request-logging.js";

const CREATED_STATUS = 201;

export const GET = withRequestLogging("/api/amenities", async (request) => {
    try {
        const manager = await requireRole([USER_ROLES.MANAGER]);
        const { searchParams } = new URL(request.url);
        const pagination = parseWithSchema(
            paginationQuerySchema,
            Object.fromEntries(searchParams),
        );
        const result = await amenityService.listAmenities(manager, pagination);
        return jsonSuccess(result);
    } catch (error) {
        return jsonError(error, request);
    }
});

export const POST = withRequestLogging("/api/amenities", async (request) => {
    try {
        const manager = await requireRole([USER_ROLES.MANAGER]);
        const body = await readJsonBody(request);
        const input = parseWithSchema(createAmenitySchema, body);
        const amenity = await amenityService.createAmenity(manager, input);
        return jsonSuccess(amenity, CREATED_STATUS);
    } catch (error) {
        return jsonError(error, request);
    }
});
