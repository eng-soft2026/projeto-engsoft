import { jsonError, jsonSuccess } from "../../../../lib/route-response.js";
import { signOut } from "../../../../modules/auth/auth.js";

export async function POST(request) {
    try {
        await signOut({ redirect: false });
        return jsonSuccess(null);
    } catch (error) {
        return jsonError(error, request);
    }
}
