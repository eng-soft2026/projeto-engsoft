import { getRequestContext } from "../../../../lib/request-context.js";
import { readJsonBody } from "../../../../lib/request-body.js";
import { jsonError, jsonSuccess } from "../../../../lib/route-response.js";
import { parseWithSchema } from "../../../../lib/validation.js";
import { resetPasswordSchema } from "../../../../schemas/user-schemas.js";
import { passwordResetService } from "../../../../services/password-reset-service.js";
import { withRequestLogging } from "../../../../lib/request-logging.js";

export const POST = withRequestLogging(
    "/api/auth/reset-password",
    async (request) => {
        try {
            const body = await readJsonBody(request);
            const input = parseWithSchema(resetPasswordSchema, body);
            const { ipAddress } = getRequestContext(request);
            await passwordResetService.resetPassword({ ...input, ipAddress });
            return jsonSuccess(null);
        } catch (error) {
            return jsonError(error, request);
        }
    },
);
