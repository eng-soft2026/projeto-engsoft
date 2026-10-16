import { notFound, redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "../../lib/errors.js";
import { setRequestUserId } from "../../lib/request-store.js";
import { authService } from "../../services/auth-service.js";
import { auth } from "./auth.js";

export const LOGIN_PATH = "/login";

function hasAllowedRole(user, allowedRoles) {
    return allowedRoles.includes(user.role);
}

export async function getCurrentUser() {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        return null;
    }
    const user = await authService.findActiveUser(userId);
    if (user) {
        setRequestUserId(user.id);
    }
    return user;
}

export async function requireAuth() {
    const user = await getCurrentUser();
    if (!user) {
        throw new UnauthorizedError("Faça login para continuar.");
    }
    return user;
}

export async function requireRole(allowedRoles) {
    const user = await requireAuth();
    if (!hasAllowedRole(user, allowedRoles)) {
        throw new ForbiddenError(
            "Você não tem permissão para acessar este recurso.",
        );
    }
    return user;
}

export async function requirePageAuth() {
    const user = await getCurrentUser();
    if (!user) {
        redirect(LOGIN_PATH);
    }
    return user;
}

export async function requirePageRole(allowedRoles) {
    const user = await requirePageAuth();
    if (!hasAllowedRole(user, allowedRoles)) {
        notFound();
    }
    return user;
}
