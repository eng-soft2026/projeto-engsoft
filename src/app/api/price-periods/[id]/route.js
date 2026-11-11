import { USER_ROLES } from "../../../../constants/user-roles.js";
import { readJsonBody } from "../../../../lib/request-body.js";
import { withRequestLogging } from "../../../../lib/request-logging.js";
import { parseRouteParams } from "../../../../lib/route-params.js";
import { jsonError, jsonSuccess } from "../../../../lib/route-response.js";
import { parseWithSchema } from "../../../../lib/validation.js";
import { requireRole } from "../../../../modules/auth/guards.js";
import {
    roomPricePeriodParamsSchema,
    updateRoomPricePeriodSchema,
} from "../../../../schemas/room-price-period-schemas.js";
import { roomPricePeriodService } from "../../../../services/room-price-period-service.js";

export const PATCH = withRequestLogging(
    "/api/price-periods/[id]",
    async (request, context) => {
        try {
            const manager = await requireRole([USER_ROLES.MANAGER]);
            const { id } = await parseRouteParams(
                context,
                roomPricePeriodParamsSchema,
            );
            const body = await readJsonBody(request);
            const changes = parseWithSchema(updateRoomPricePeriodSchema, body);
            const period = await roomPricePeriodService.updatePricePeriod(
                manager,
                id,
                changes,
            );
            return jsonSuccess(period);
        } catch (error) {
            return jsonError(error, request);
        }
    },
);

export const DELETE = withRequestLogging(
    "/api/price-periods/[id]",
    async (request, context) => {
        try {
            const manager = await requireRole([USER_ROLES.MANAGER]);
            const { id } = await parseRouteParams(
                context,
                roomPricePeriodParamsSchema,
            );
            const result = await roomPricePeriodService.deletePricePeriod(
                manager,
                id,
            );
            return jsonSuccess(result);
        } catch (error) {
            return jsonError(error, request);
        }
    },
);
