import { USER_ROLES } from "../../src/constants/user-roles.js";

export const E2E_USERS = Object.freeze({
    [USER_ROLES.CUSTOMER]: Object.freeze({
        name: "Cliente E2E",
        email: "cliente.e2e@example.com",
        cpf: "52998224725",
        password: "senha-e2e-cliente-1",
        role: USER_ROLES.CUSTOMER,
    }),
    [USER_ROLES.MANAGER]: Object.freeze({
        name: "Gestor E2E",
        email: "gestor.e2e@example.com",
        cpf: "11144477735",
        password: "senha-e2e-gestor-1",
        role: USER_ROLES.MANAGER,
    }),
    [USER_ROLES.ADMIN]: Object.freeze({
        name: "Admin E2E",
        email: "admin.e2e@example.com",
        cpf: "93541134780",
        password: "senha-e2e-admin-1",
        role: USER_ROLES.ADMIN,
    }),
});

export function getE2eUser(role) {
    const user = E2E_USERS[role];
    if (!user) {
        throw new Error(`No e2e user for role ${role}`);
    }
    return user;
}
