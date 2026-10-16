import { USER_ROLES } from "../../../../../constants/user-roles.js";
import { readJsonBody } from "../../../../../lib/request-body.js";
import { parseRouteParams } from "../../../../../lib/route-params.js";
import { jsonError, jsonSuccess } from "../../../../../lib/route-response.js";
import { parseWithSchema } from "../../../../../lib/validation.js";
import { requireRole } from "../../../../../modules/auth/guards.js";
import { createRoomSchema } from "../../../../../schemas/room-schemas.js";
import { unitParamsSchema } from "../../../../../schemas/unit-schemas.js";
import { roomService } from "../../../../../services/room-service.js";

const CREATED_STATUS = 201;

export async function GET(request, context) {
    try {
        const user = await requireRole([USER_ROLES.MANAGER, USER_ROLES.ADMIN]);
        const { id } = await parseRouteParams(context, unitParamsSchema);
        const rooms = await roomService.listRooms(user, id);
        return jsonSuccess(rooms);
    } catch (error) {
        return jsonError(error, request);
    }
}

export async function POST(request, context) {
    try {
        const manager = await requireRole([USER_ROLES.MANAGER]);
        const { id } = await parseRouteParams(context, unitParamsSchema);
        const body = await readJsonBody(request);
        const input = parseWithSchema(createRoomSchema, body);
        const room = await roomService.createRoom(manager, id, input);
        return jsonSuccess(room, CREATED_STATUS);
    } catch (error) {
        return jsonError(error, request);
    }
}
