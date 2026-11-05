import { USER_ROLES } from "../../constants/user-roles.js";
import { readJsonBody } from "../../lib/request-body.js";
import { parseRouteParams } from "../../lib/route-params.js";
import { jsonError, jsonSuccess } from "../../lib/route-response.js";
import { parseWithSchema } from "../../lib/validation.js";
import { replaceAmenitiesSchema } from "../../schemas/amenity-schemas.js";
import { amenityAssociationService } from "../../services/amenity-association-service.js";
import { requireRole } from "../auth/guards.js";

export function createAmenityAssociationHandlers(target, paramsSchema) {
    async function GET(request, context) {
        try {
            const user = await requireRole([
                USER_ROLES.MANAGER,
                USER_ROLES.ADMIN,
            ]);
            const { id } = await parseRouteParams(context, paramsSchema);
            const amenities = await amenityAssociationService.listAmenities(
                user,
                target,
                id,
            );
            return jsonSuccess(amenities);
        } catch (error) {
            return jsonError(error, request);
        }
    }

    async function PUT(request, context) {
        try {
            const manager = await requireRole([USER_ROLES.MANAGER]);
            const { id } = await parseRouteParams(context, paramsSchema);
            const body = await readJsonBody(request);
            const input = parseWithSchema(replaceAmenitiesSchema, body);
            const amenities = await amenityAssociationService.replaceAmenities(
                manager,
                target,
                id,
                input,
            );
            return jsonSuccess(amenities);
        } catch (error) {
            return jsonError(error, request);
        }
    }

    return Object.freeze({ GET, PUT });
}
