import { jsonError } from "../../../../lib/route-response.js";
import { withRequestLogging } from "../../../../lib/request-logging.js";
import { buildReadinessResponse } from "../../../../modules/health/health-response.js";
import { healthService } from "../../../../modules/health/health-service.js";

export const GET = withRequestLogging("/api/health/ready", async (request) => {
    try {
        const readiness = await healthService.checkReadiness();
        return buildReadinessResponse(readiness);
    } catch (error) {
        return jsonError(error, request);
    }
});
