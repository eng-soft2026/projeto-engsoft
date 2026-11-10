import { describe, expect, it } from "vitest";
import { USER_ROLES } from "../../../src/constants/user-roles.js";
import { getUserRoleLabel } from "../../../src/modules/users/user-role-labels.js";

describe("getUserRoleLabel", () => {
    it.each([
        [USER_ROLES.CUSTOMER, "Cliente"],
        [USER_ROLES.MANAGER, "Gestor de hotel"],
        [USER_ROLES.ADMIN, "Administrador"],
    ])("labels %s in Portuguese", (role, label) => {
        expect(getUserRoleLabel(role)).toBe(label);
    });

    it("falls back to the raw role", () => {
        expect(getUserRoleLabel("UNKNOWN")).toBe("UNKNOWN");
    });
});
