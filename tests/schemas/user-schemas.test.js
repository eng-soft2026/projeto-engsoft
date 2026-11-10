import { describe, expect, it } from "vitest";
import {
    changePasswordFormSchema,
    forgotPasswordSchema,
    loginSchema,
    profileDetailsFormSchema,
    registerFormSchema,
    registerUserSchema,
    resetPasswordFormSchema,
    resetPasswordSchema,
    updateProfileSchema,
    userAccountSchema,
} from "../../src/schemas/user-schemas.js";

const VALID_REGISTRATION = Object.freeze({
    name: "Ana Souza",
    email: "ana@example.com",
    cpf: "529.982.247-25",
    password: "senhaSegura1",
});

function firstIssue(schema, input) {
    const result = schema.safeParse(input);
    expect(result.success).toBe(false);
    return result.error.issues[0];
}

describe("registerUserSchema", () => {
    it("normalizes name, e-mail and CPF", () => {
        const data = registerUserSchema.parse({
            ...VALID_REGISTRATION,
            name: "  Ana Souza  ",
            email: "  ANA@Example.COM ",
        });

        expect(data).toMatchObject({
            name: "Ana Souza",
            email: "ana@example.com",
            cpf: "52998224725",
        });
    });

    it("defaults the role to CUSTOMER", () => {
        expect(registerUserSchema.parse(VALID_REGISTRATION).role).toBe(
            "CUSTOMER",
        );
    });

    it("accepts MANAGER as role", () => {
        const data = registerUserSchema.parse({
            ...VALID_REGISTRATION,
            role: "MANAGER",
        });

        expect(data.role).toBe("MANAGER");
    });

    it("rejects ADMIN as role", () => {
        const issue = firstIssue(registerUserSchema, {
            ...VALID_REGISTRATION,
            role: "ADMIN",
        });

        expect(issue.path).toEqual(["role"]);
    });

    it("rejects an invalid CPF with the INVALID_CPF code", () => {
        const issue = firstIssue(registerUserSchema, {
            ...VALID_REGISTRATION,
            cpf: "529.982.247-26",
        });

        expect(issue.message).toBe("CPF inválido.");
        expect(issue.params).toEqual({ errorCode: "INVALID_CPF" });
    });

    it("rejects an invalid e-mail", () => {
        const issue = firstIssue(registerUserSchema, {
            ...VALID_REGISTRATION,
            email: "ana.example.com",
        });

        expect(issue.path).toEqual(["email"]);
    });

    it("rejects a name shorter than 2 characters", () => {
        const issue = firstIssue(registerUserSchema, {
            ...VALID_REGISTRATION,
            name: " A ",
        });

        expect(issue.path).toEqual(["name"]);
    });

    it("rejects missing fields with Portuguese messages", () => {
        const issue = firstIssue(registerUserSchema, {});

        expect(issue.message).toBe("Informe o nome.");
    });

    it("rejects a body that is not an object", () => {
        const issue = firstIssue(registerUserSchema, null);

        expect(issue.message).toBe("Envie os dados do usuário.");
    });

    it("drops unknown fields", () => {
        const data = registerUserSchema.parse({
            ...VALID_REGISTRATION,
            isActive: false,
            passwordHash: "x",
        });

        expect(data).not.toHaveProperty("isActive");
        expect(data).not.toHaveProperty("passwordHash");
    });
});

describe("password policy", () => {
    it.each([
        ["abc123", "A senha deve ter pelo menos 8 caracteres."],
        ["12345678", "A senha deve conter pelo menos uma letra."],
        ["abcdefgh", "A senha deve conter pelo menos um número."],
        ["a1".repeat(37), "A senha deve ter no máximo 72 bytes."],
    ])("rejects %s", (password, message) => {
        const issue = firstIssue(userAccountSchema, {
            ...VALID_REGISTRATION,
            password,
        });

        expect(issue.message).toBe(message);
    });

    it("counts bytes, not characters, for the 72-byte limit", () => {
        const issue = firstIssue(userAccountSchema, {
            ...VALID_REGISTRATION,
            password: `1${"é".repeat(36)}`,
        });

        expect(issue.message).toBe("A senha deve ter no máximo 72 bytes.");
    });

    it("accepts a password with exactly 72 bytes", () => {
        const result = userAccountSchema.safeParse({
            ...VALID_REGISTRATION,
            password: "a1".repeat(36),
        });

        expect(result.success).toBe(true);
    });
});

describe("registerFormSchema", () => {
    it("accepts a matching password confirmation", () => {
        const data = registerFormSchema.parse({
            ...VALID_REGISTRATION,
            passwordConfirmation: VALID_REGISTRATION.password,
        });

        expect(data.passwordConfirmation).toBe(VALID_REGISTRATION.password);
        expect(data.cpf).toBe("52998224725");
    });

    it("rejects a different password confirmation on its field", () => {
        const issue = firstIssue(registerFormSchema, {
            ...VALID_REGISTRATION,
            passwordConfirmation: "outraSenha1",
        });

        expect(issue.path).toEqual(["passwordConfirmation"]);
        expect(issue.message).toBe("As senhas não conferem.");
    });
});

describe("loginSchema", () => {
    it("normalizes the e-mail", () => {
        expect(
            loginSchema.parse({ email: " ANA@EXAMPLE.COM ", password: "x" }),
        ).toEqual({ email: "ana@example.com", password: "x" });
    });

    it("does not apply the registration password policy", () => {
        const result = loginSchema.safeParse({
            email: "ana@example.com",
            password: "short",
        });

        expect(result.success).toBe(true);
    });

    it("requires the password", () => {
        const issue = firstIssue(loginSchema, {
            email: "ana@example.com",
            password: "",
        });

        expect(issue.message).toBe("Informe a senha.");
    });
});

describe("forgotPasswordSchema", () => {
    it("normalizes the e-mail", () => {
        expect(
            forgotPasswordSchema.parse({ email: " ANA@EXAMPLE.COM " }),
        ).toEqual({ email: "ana@example.com" });
    });

    it("rejects an invalid e-mail", () => {
        const result = forgotPasswordSchema.safeParse({
            email: "not-an-email",
        });

        expect(result.success).toBe(false);
    });
});

describe("resetPasswordSchema", () => {
    const VALID_RESET = Object.freeze({
        token: "token-de-recuperacao",
        newPassword: "novaSenha1",
    });

    it("accepts a token and a valid new password", () => {
        expect(resetPasswordSchema.parse(VALID_RESET)).toEqual(VALID_RESET);
    });

    it.each([
        ["abc123", "A senha deve ter pelo menos 8 caracteres."],
        ["12345678", "A senha deve conter pelo menos uma letra."],
        ["abcdefgh", "A senha deve conter pelo menos um número."],
        ["a1".repeat(37), "A senha deve ter no máximo 72 bytes."],
        [`1${"é".repeat(36)}`, "A senha deve ter no máximo 72 bytes."],
    ])("applies the password policy to %s", (newPassword, message) => {
        const issue = firstIssue(resetPasswordSchema, {
            ...VALID_RESET,
            newPassword,
        });

        expect(issue.message).toBe(message);
    });

    it("accepts a new password with exactly 72 bytes", () => {
        const result = resetPasswordSchema.safeParse({
            ...VALID_RESET,
            newPassword: "a1".repeat(36),
        });

        expect(result.success).toBe(true);
    });

    it.each([
        ["", "Informe o token de recuperação."],
        ["   ", "Informe o token de recuperação."],
        ["a".repeat(257), "Token de recuperação inválido."],
    ])("rejects the token %j", (token, message) => {
        const issue = firstIssue(resetPasswordSchema, {
            ...VALID_RESET,
            token,
        });

        expect(issue.message).toBe(message);
    });
});

describe("updateProfileSchema", () => {
    it("accepts a name change only", () => {
        expect(updateProfileSchema.parse({ name: " Bia " })).toEqual({
            name: "Bia",
        });
    });

    it("drops the CPF, which cannot be changed", () => {
        const data = updateProfileSchema.parse({
            name: "Bia",
            cpf: "111.444.777-35",
        });

        expect(data).not.toHaveProperty("cpf");
    });

    it("requires at least one change", () => {
        const issue = firstIssue(updateProfileSchema, {});

        expect(issue.message).toBe("Informe ao menos um campo para atualizar.");
    });

    it("requires the current password to change the password", () => {
        const issue = firstIssue(updateProfileSchema, {
            newPassword: "novaSenha1",
        });

        expect(issue.path).toEqual(["currentPassword"]);
    });

    it("applies the password policy to the new password", () => {
        const issue = firstIssue(updateProfileSchema, {
            newPassword: "curta",
            currentPassword: "senhaSegura1",
        });

        expect(issue.path).toEqual(["newPassword"]);
    });

    it("normalizes a new e-mail", () => {
        expect(updateProfileSchema.parse({ email: " BIA@X.COM " })).toEqual({
            email: "bia@x.com",
        });
    });
});

describe("profileDetailsFormSchema", () => {
    it("normalizes name and e-mail", () => {
        expect(
            profileDetailsFormSchema.parse({
                name: "  Ana Souza ",
                email: " ANA@Example.com",
            }),
        ).toEqual({ name: "Ana Souza", email: "ana@example.com" });
    });

    it("requires both fields", () => {
        expect(
            profileDetailsFormSchema.safeParse({ name: "Ana Souza" }).success,
        ).toBe(false);
    });
});

describe("changePasswordFormSchema", () => {
    const VALID_CHANGE = Object.freeze({
        currentPassword: "senhaAtual1",
        newPassword: "novaSenha1",
        newPasswordConfirmation: "novaSenha1",
    });

    it("accepts a matching confirmation", () => {
        expect(changePasswordFormSchema.parse(VALID_CHANGE)).toEqual(
            VALID_CHANGE,
        );
    });

    it("requires the current password", () => {
        const issue = firstIssue(changePasswordFormSchema, {
            ...VALID_CHANGE,
            currentPassword: "",
        });

        expect(issue.path).toEqual(["currentPassword"]);
        expect(issue.message).toBe("Informe a senha atual.");
    });

    it("applies the password policy to the new password", () => {
        const issue = firstIssue(changePasswordFormSchema, {
            ...VALID_CHANGE,
            newPassword: "semnumero",
            newPasswordConfirmation: "semnumero",
        });

        expect(issue.path).toEqual(["newPassword"]);
    });

    it("rejects a different confirmation on its field", () => {
        const issue = firstIssue(changePasswordFormSchema, {
            ...VALID_CHANGE,
            newPasswordConfirmation: "outraSenha1",
        });

        expect(issue.path).toEqual(["newPasswordConfirmation"]);
        expect(issue.message).toBe("As senhas não conferem.");
    });
});

describe("resetPasswordFormSchema", () => {
    it("accepts a matching confirmation", () => {
        expect(
            resetPasswordFormSchema.parse({
                newPassword: "novaSenha1",
                newPasswordConfirmation: "novaSenha1",
            }),
        ).toEqual({
            newPassword: "novaSenha1",
            newPasswordConfirmation: "novaSenha1",
        });
    });

    it("rejects a different confirmation on its field", () => {
        const issue = firstIssue(resetPasswordFormSchema, {
            newPassword: "novaSenha1",
            newPasswordConfirmation: "outraSenha1",
        });

        expect(issue.path).toEqual(["newPasswordConfirmation"]);
    });
});
