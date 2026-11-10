import { USER_ROLES } from "../../constants/user-roles.js";

export const USER_ROLE_LABELS = Object.freeze({
    [USER_ROLES.CUSTOMER]: "Cliente",
    [USER_ROLES.MANAGER]: "Gestor de hotel",
    [USER_ROLES.ADMIN]: "Administrador",
});

export function getUserRoleLabel(role) {
    return USER_ROLE_LABELS[role] ?? role;
}
