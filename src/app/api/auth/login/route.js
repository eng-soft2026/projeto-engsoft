import { CredentialsSignin } from "next-auth";
import {
    ERROR_CODES,
    UnauthorizedError,
    ValidationError,
} from "../../../../lib/errors.js";
import { readJsonBody } from "../../../../lib/request-body.js";
import { jsonError, jsonSuccess } from "../../../../lib/route-response.js";
import { parseWithSchema } from "../../../../lib/validation.js";
import { signIn } from "../../../../modules/auth/auth.js";
import { loginSchema } from "../../../../schemas/user-schemas.js";
import { userService } from "../../../../services/user-service.js";

const AUTH_RETURN_REDIRECT_HEADER = "x-auth-return-redirect";

function assertNoAuthRedirectHeader(request) {
    if (request.headers.has(AUTH_RETURN_REDIRECT_HEADER)) {
        throw new ValidationError("Requisição de login inválida.");
    }
}

async function signInWithCredentials({ email, password }) {
    try {
        await signIn("credentials", { email, password, redirect: false });
    } catch (error) {
        if (error instanceof CredentialsSignin) {
            throw new UnauthorizedError(
                "E-mail ou senha inválidos.",
                ERROR_CODES.INVALID_CREDENTIALS,
            );
        }
        throw error;
    }
}

export async function POST(request) {
    try {
        assertNoAuthRedirectHeader(request);
        const body = await readJsonBody(request);
        const credentials = parseWithSchema(loginSchema, body);
        await signInWithCredentials(credentials);
        const user = await userService.getProfileByEmail(credentials.email);
        return jsonSuccess(user);
    } catch (error) {
        return jsonError(error);
    }
}
