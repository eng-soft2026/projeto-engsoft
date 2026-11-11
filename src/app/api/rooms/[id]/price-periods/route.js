import { USER_ROLES } from "../../../../../constants/user-roles.js";
import { readJsonBody } from "../../../../../lib/request-body.js";
import { withRequestLogging } from "../../../../../lib/request-logging.js";
import { parseRouteParams } from "../../../../../lib/route-params.js";
import { jsonError, jsonSuccess } from "../../../../../lib/route-response.js";
import { parseWithSchema } from "../../../../../lib/validation.js";
import { requireRole } from "../../../../../modules/auth/guards.js";
import { createRoomPricePeriodSchema } from "../../../../../schemas/room-price-period-schemas.js";
import { roomParamsSchema } from "../../../../../schemas/room-schemas.js";
import { roomPricePeriodService } from "../../../../../services/room-price-period-service.js";

export const GET = withRequestLogging(
    "/api/rooms/[id]/price-periods",
    async (request, context) => {
        try {
            const user = await requireRole([
                USER_ROLES.MANAGER,
                USER_ROLES.ADMIN,
            ]);
            const { id } = await parseRouteParams(context, roomParamsSchema);
            const periods = await roomPricePeriodService.listPricePeriods(
                user,
                id,
            );
            return jsonSuccess(periods);
        } catch (error) {
            return jsonError(error, request);
        }
    },
);

export const POST = withRequestLogging(
    "/api/rooms/[id]/price-periods",
    async (request, context) => {
        try {
            const manager = await requireRole([USER_ROLES.MANAGER]);
            const { id } = await parseRouteParams(context, roomParamsSchema);
            const body = await readJsonBody(request);
            const input = parseWithSchema(createRoomPricePeriodSchema, body);
            const period = await roomPricePeriodService.createPricePeriod(
                manager,
                id,
                input,
            );
            return jsonSuccess(period, 201);
        } catch (error) {
            return jsonError(error, request);
        }
    },
);
