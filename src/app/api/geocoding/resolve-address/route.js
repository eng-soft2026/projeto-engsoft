import { USER_ROLES } from "../../../../constants/user-roles.js";
import { readJsonBody } from "../../../../lib/request-body.js";
import { withRequestLogging } from "../../../../lib/request-logging.js";
import { jsonError, jsonSuccess } from "../../../../lib/route-response.js";
import { parseWithSchema } from "../../../../lib/validation.js";
import { requireRole } from "../../../../modules/auth/guards.js";
import { geocodingService } from "../../../../modules/maps/geocoding-service.js";
import { resolveAddressSchema } from "../../../../schemas/geocoding-schemas.js";

export const POST = withRequestLogging(
    "/api/geocoding/resolve-address",
    async (request) => {
        try {
            const manager = await requireRole([USER_ROLES.MANAGER]);
            const body = await readJsonBody(request);
            const address = parseWithSchema(resolveAddressSchema, body);
            const coordinates = await geocodingService.resolveAddress(
                manager,
                address,
            );
            return jsonSuccess(coordinates);
        } catch (error) {
            return jsonError(error, request);
        }
    },
);
