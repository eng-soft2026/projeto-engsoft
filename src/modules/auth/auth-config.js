import Credentials from "next-auth/providers/credentials";
import { loginSchema } from "../../schemas/user-schemas.js";
import { authService } from "../../services/auth-service.js";

export const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

export async function authorizeCredentials(credentials) {
    const result = loginSchema.safeParse(credentials);
    if (!result.success) {
        return null;
    }
    return authService.verifyCredentials(result.data);
}

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
