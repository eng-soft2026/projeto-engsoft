import { USER_ROLES } from "../../../../constants/user-roles.js";
import { readJsonBody } from "../../../../lib/request-body.js";
import { withRequestLogging } from "../../../../lib/request-logging.js";
import { jsonError, jsonSuccess } from "../../../../lib/route-response.js";
import { parseWithSchema } from "../../../../lib/validation.js";
import { requireRole } from "../../../../modules/auth/guards.js";
import { mediaService } from "../../../../modules/media/media-service.js";
import { signUploadSchema } from "../../../../schemas/media-schemas.js";

export const POST = withRequestLogging(
    "/api/media/sign-upload",
    async (request) => {
        try {
            const manager = await requireRole([USER_ROLES.MANAGER]);
            const body = await readJsonBody(request);
            const input = parseWithSchema(signUploadSchema, body);
            const signedUpload = await mediaService.signUpload(manager, input);
            return jsonSuccess(signedUpload);
        } catch (error) {
            return jsonError(error, request);
        }
    },
);
