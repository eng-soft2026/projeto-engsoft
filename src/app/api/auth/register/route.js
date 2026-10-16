import { readJsonBody } from "../../../../lib/request-body.js";
import { jsonError, jsonSuccess } from "../../../../lib/route-response.js";
import { parseWithSchema } from "../../../../lib/validation.js";
import { registerUserSchema } from "../../../../schemas/user-schemas.js";
import { userService } from "../../../../services/user-service.js";

const CREATED_STATUS = 201;

export async function POST(request) {
    try {
        const body = await readJsonBody(request);
        const input = parseWithSchema(registerUserSchema, body);
        const user = await userService.createUser(input);
        return jsonSuccess(user, CREATED_STATUS);
    } catch (error) {
        return jsonError(error, request);
    }
}
