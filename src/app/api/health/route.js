import { withRequestLogging } from "../../../lib/request-logging.js";
import { buildLivenessResponse } from "../../../modules/health/health-response.js";

export const GET = withRequestLogging("/api/health", async () => {
    return buildLivenessResponse();
});
