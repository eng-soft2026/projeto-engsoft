import { USER_ROLES } from "../../../../constants/user-roles.js";
import { readJsonBody } from "../../../../lib/request-body.js";
import { parseRouteParams } from "../../../../lib/route-params.js";
import { jsonError, jsonSuccess } from "../../../../lib/route-response.js";
import { parseWithSchema } from "../../../../lib/validation.js";
import { requireRole } from "../../../../modules/auth/guards.js";
import {
    roomParamsSchema,
    updateRoomSchema,
} from "../../../../schemas/room-schemas.js";
import { roomService } from "../../../../services/room-service.js";

export async function GET(request, context) {
    try {
        const user = await requireRole([USER_ROLES.MANAGER, USER_ROLES.ADMIN]);
        const { id } = await parseRouteParams(context, roomParamsSchema);
        const room = await roomService.getRoom(user, id);
        return jsonSuccess(room);
    } catch (error) {
        return jsonError(error, request);
    }
}

export async function PATCH(request, context) {
    try {
        const manager = await requireRole([USER_ROLES.MANAGER]);
        const { id } = await parseRouteParams(context, roomParamsSchema);
        const body = await readJsonBody(request);
        const changes = parseWithSchema(updateRoomSchema, body);
        const room = await roomService.updateRoom(manager, id, changes);
        return jsonSuccess(room);
    } catch (error) {
        return jsonError(error, request);
    }
}

export async function DELETE(request, context) {
    try {
        const manager = await requireRole([USER_ROLES.MANAGER]);
        const { id } = await parseRouteParams(context, roomParamsSchema);
        const result = await roomService.deleteRoom(manager, id);
        return jsonSuccess(result);
    } catch (error) {
        return jsonError(error, request);
    }
}
