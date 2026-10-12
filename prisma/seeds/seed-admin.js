import { USER_ROLES } from "../../src/constants/user-roles.js";
import { ValidationError } from "../../src/lib/errors.js";
import { parseWithSchema } from "../../src/lib/validation.js";
import { userAccountSchema } from "../../src/schemas/user-schemas.js";

export const ADMIN_ENV_KEYS = Object.freeze({
    name: "ADMIN_NAME",
    email: "ADMIN_EMAIL",
    cpf: "ADMIN_CPF",
    password: "ADMIN_PASSWORD",
});

export const ADMIN_SEED_RESULTS = Object.freeze({
    SKIPPED: "SKIPPED",
    ALREADY_EXISTS: "ALREADY_EXISTS",
    CREATED: "CREATED",
});

export function readAdminSeedInput(env) {
    const entries = Object.entries(ADMIN_ENV_KEYS).map(([field, key]) => [
        field,
        env[key] ?? "",
    ]);
    const filledCount = entries.filter(([, value]) => value !== "").length;

    if (filledCount === 0) {
        return null;
    }
    if (filledCount < entries.length) {
        throw new Error(
            `Set all of ${Object.values(ADMIN_ENV_KEYS).join(", ")} or none of them.`,
        );
    }
    return Object.fromEntries(entries);
}

function parseAdminInput(adminInput) {
    try {
        return parseWithSchema(userAccountSchema, adminInput);
    } catch (error) {
        if (error instanceof ValidationError) {
            throw new Error(`Invalid admin seed data: ${error.message}`, {
                cause: error,
            });
        }
        throw error;
    }
}

async function assertCpfIsFree(userRepository, cpf) {
    const cpfOwner = await userRepository.findByCpf(cpf);
    if (cpfOwner) {
        throw new Error(
            `${ADMIN_ENV_KEYS.cpf} already belongs to another user.`,
        );
    }
}

export async function seedAdmin({ adminInput, userRepository, userService }) {
    if (!adminInput) {
        return ADMIN_SEED_RESULTS.SKIPPED;
    }

    const admin = parseAdminInput(adminInput);
    const existingUser = await userRepository.findByEmail(admin.email);
    if (existingUser?.role === USER_ROLES.ADMIN) {
        return ADMIN_SEED_RESULTS.ALREADY_EXISTS;
    }
    if (existingUser) {
        throw new Error(
            `${ADMIN_ENV_KEYS.email} belongs to a user without the ADMIN role.`,
        );
    }

    await assertCpfIsFree(userRepository, admin.cpf);
    await userService.createUser({ ...admin, role: USER_ROLES.ADMIN });
    return ADMIN_SEED_RESULTS.CREATED;
}
