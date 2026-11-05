import { USER_ROLES } from "../../../../constants/user-roles.js";
import { readJsonBody } from "../../../../lib/request-body.js";
import { parseRouteParams } from "../../../../lib/route-params.js";
import { jsonError, jsonSuccess } from "../../../../lib/route-response.js";
import { parseWithSchema } from "../../../../lib/validation.js";
import { requireRole } from "../../../../modules/auth/guards.js";
import {
    roomTypeParamsSchema,
    updateRoomTypeSchema,
} from "../../../../schemas/room-type-schemas.js";
import { roomTypeService } from "../../../../services/room-type-service.js";
import { withRequestLogging } from "../../../../lib/request-logging.js";

export const GET = withRequestLogging(
    "/api/room-types/[id]",
    async (request, context) => {
        try {
            const user = await requireRole([
                USER_ROLES.MANAGER,
                USER_ROLES.ADMIN,
            ]);
            const { id } = await parseRouteParams(
                context,
                roomTypeParamsSchema,
            );
            const roomType = await roomTypeService.getRoomType(user, id);
            return jsonSuccess(roomType);
        } catch (error) {
            return jsonError(error, request);
        }
    },
);

export const PATCH = withRequestLogging(
    "/api/room-types/[id]",
    async (request, context) => {
        try {
            const manager = await requireRole([USER_ROLES.MANAGER]);
            const { id } = await parseRouteParams(
                context,
                roomTypeParamsSchema,
            );
            const body = await readJsonBody(request);
            const changes = parseWithSchema(updateRoomTypeSchema, body);
            const roomType = await roomTypeService.updateRoomType(
                manager,
                id,
                changes,
            );
            return jsonSuccess(roomType);
        } catch (error) {
            return jsonError(error, request);
        }
    },
);

export const DELETE = withRequestLogging(
    "/api/room-types/[id]",
    async (request, context) => {
        try {
            const manager = await requireRole([USER_ROLES.MANAGER]);
            const { id } = await parseRouteParams(
                context,
                roomTypeParamsSchema,
            );
            const result = await roomTypeService.deleteRoomType(manager, id);
            return jsonSuccess(result);
        } catch (error) {
            return jsonError(error, request);
        }
    },
);
