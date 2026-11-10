import Credentials from "next-auth/providers/credentials";
import { loginSchema } from "../../schemas/user-schemas.js";
import { authService as defaultAuthService } from "../../services/auth-service.js";
import {
    LoginRateLimitedError,
    buildLoginAttemptKey,
    loginRateLimiter,
} from "./login-rate-limit.js";

export const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

export function createCredentialsAuthorizer({ authService, rateLimiter }) {
    return async function authorize(credentials, request) {
        const result = loginSchema.safeParse(credentials);
        if (!result.success) {
            return null;
        }

        const attemptKey = buildLoginAttemptKey({
            email: result.data.email,
            request,
        });
        const { isLimited, retryAfterSeconds } =
            await rateLimiter.check(attemptKey);
        if (isLimited) {
            throw new LoginRateLimitedError(retryAfterSeconds);
        }

        const user = await authService.verifyCredentials(result.data);
        if (!user) {
            await rateLimiter.recordFailure(attemptKey);
            return null;
        }

        await rateLimiter.reset(attemptKey);
        return user;
    };
}

export const authorizeCredentials = createCredentialsAuthorizer({
    authService: defaultAuthService,
    rateLimiter: loginRateLimiter,
});

export function addRoleToToken({ token, user }) {
    if (!user) {
        return token;
    }
    return { ...token, role: user.role };
}

export function addIdentityToSession({ session, token }) {
    return {
        ...session,
        user: { ...session.user, id: token.sub, role: token.role },
    };
}

export const authConfig = {
    providers: [
        Credentials({
            credentials: {
                email: { label: "E-mail", type: "email" },
                password: { label: "Senha", type: "password" },
            },
            authorize: authorizeCredentials,
        }),
    ],
    session: {
        strategy: "jwt",
        maxAge: SESSION_MAX_AGE_SECONDS,
    },
    callbacks: {
        jwt: addRoleToToken,
        session: addIdentityToSession,
    },
};
