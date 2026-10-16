import { handlers } from "../../../../modules/auth/auth.js";
import { withRequestLogging } from "../../../../lib/request-logging.js";

export const GET = withRequestLogging("/api/auth/[...nextauth]", handlers.GET);
export const POST = withRequestLogging(
    "/api/auth/[...nextauth]",
    handlers.POST,
);
