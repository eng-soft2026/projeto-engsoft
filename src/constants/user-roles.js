import { UserRole } from "../generated/prisma/enums.ts";

export const USER_ROLES = Object.freeze({ ...UserRole });

export const SELF_REGISTRATION_ROLES = Object.freeze([
    USER_ROLES.CUSTOMER,
    USER_ROLES.MANAGER,
]);
