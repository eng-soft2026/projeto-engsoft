import { jsonError, jsonSuccess } from "../../../../lib/route-response.js";
import { signOut } from "../../../../modules/auth/auth.js";
import { withRequestLogging } from "../../../../lib/request-logging.js";

export const POST = withRequestLogging("/api/auth/logout", async (request) => {
    try {
        await signOut({ redirect: false });
        return jsonSuccess(null);
    } catch (error) {
        return jsonError(error, request);
    }
});
