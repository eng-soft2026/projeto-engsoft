import { readJsonBody } from "../../../../lib/request-body.js";
import { jsonError, jsonSuccess } from "../../../../lib/route-response.js";
import { parseWithSchema } from "../../../../lib/validation.js";
import { requireAuth } from "../../../../modules/auth/guards.js";
import { updateProfileSchema } from "../../../../schemas/user-schemas.js";
import { userService } from "../../../../services/user-service.js";
import { withRequestLogging } from "../../../../lib/request-logging.js";

export const GET = withRequestLogging("/api/users/me", async (request) => {
    try {
        const user = await requireAuth();
        return jsonSuccess(user);
    } catch (error) {
        return jsonError(error, request);
    }
});

export const PATCH = withRequestLogging("/api/users/me", async (request) => {
    try {
        const user = await requireAuth();
        const body = await readJsonBody(request);
        const changes = parseWithSchema(updateProfileSchema, body);
        const updatedUser = await userService.updateProfile(user.id, changes);
        return jsonSuccess(updatedUser);
    } catch (error) {
        return jsonError(error, request);
    }
});
