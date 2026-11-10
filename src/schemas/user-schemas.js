import { z } from "zod";
import {
    SELF_REGISTRATION_ROLES,
    USER_ROLES,
} from "../constants/user-roles.js";
import { ERROR_CODES } from "../lib/errors.js";
import { isValidCpf, normalizeCpf } from "../utils/cpf.js";
import { emailSchema } from "./common-schemas.js";

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 150;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72;
const RESET_TOKEN_MAX_LENGTH = 256;

function countUtf8Bytes(value) {
    return new TextEncoder().encode(value).length;
}

function hasAtMostPasswordMaxBytes(value) {
    return countUtf8Bytes(value) <= PASSWORD_MAX_BYTES;
}

function hasAnyProfileChange(data) {
    return [data.name, data.email, data.newPassword].some(
        (value) => value !== undefined,
    );
}

function hasMatchingPasswordConfirmation(data) {
    return data.password === data.passwordConfirmation;
}

function hasMatchingNewPasswordConfirmation(data) {
    return data.newPassword === data.newPasswordConfirmation;
}

function hasCurrentPasswordWhenChangingPassword(data) {
    return data.newPassword === undefined || data.currentPassword !== undefined;
}

const nameSchema = z
    .string({ error: "Informe o nome." })
    .trim()
    .min(NAME_MIN_LENGTH, {
        error: `O nome deve ter pelo menos ${NAME_MIN_LENGTH} caracteres.`,
    })
    .max(NAME_MAX_LENGTH, {
        error: `O nome deve ter no máximo ${NAME_MAX_LENGTH} caracteres.`,
    });

const cpfSchema = z
    .string({ error: "Informe o CPF." })
    .trim()
    .refine(isValidCpf, {
        error: "CPF inválido.",
        params: { errorCode: ERROR_CODES.INVALID_CPF },
    })
    .transform(normalizeCpf);

const passwordSchema = z
    .string({ error: "Informe a senha." })
    .min(PASSWORD_MIN_LENGTH, {
        error: `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    })
    .refine(hasAtMostPasswordMaxBytes, {
        error: `A senha deve ter no máximo ${PASSWORD_MAX_BYTES} bytes.`,
    })
    .regex(/\p{L}/u, { error: "A senha deve conter pelo menos uma letra." })
    .regex(/\d/, { error: "A senha deve conter pelo menos um número." });

const requiredPasswordSchema = z
    .string({ error: "Informe a senha." })
    .min(1, { error: "Informe a senha." });

const currentPasswordSchema = z
    .string({ error: "Informe a senha atual." })
    .min(1, { error: "Informe a senha atual." });

export const userAccountSchema = z.object(
    {
        name: nameSchema,
        email: emailSchema,
        cpf: cpfSchema,
        password: passwordSchema,
    },
    { error: "Envie os dados do usuário." },
);

export const registerUserSchema = userAccountSchema.extend({
    role: z
        .enum(SELF_REGISTRATION_ROLES, {
            error: "Perfil inválido. Escolha cliente ou gestor.",
        })
        .default(USER_ROLES.CUSTOMER),
});

export const registerFormSchema = registerUserSchema
    .extend({
        passwordConfirmation: z.string({ error: "Confirme a senha." }),
    })
    .refine(hasMatchingPasswordConfirmation, {
        error: "As senhas não conferem.",
        path: ["passwordConfirmation"],
    });

const newPasswordConfirmationSchema = z.string({
    error: "Confirme a nova senha.",
});

const NEW_PASSWORD_MISMATCH = {
    error: "As senhas não conferem.",
    path: ["newPasswordConfirmation"],
};

export const loginSchema = z.object(
    {
        email: emailSchema,
        password: requiredPasswordSchema,
    },
    { error: "Envie e-mail e senha." },
);

export const forgotPasswordSchema = z.object(
    { email: emailSchema },
    { error: "Envie o e-mail." },
);

export const resetPasswordSchema = z.object(
    {
        token: z
            .string({ error: "Informe o token de recuperação." })
            .trim()
            .min(1, { error: "Informe o token de recuperação." })
            .max(RESET_TOKEN_MAX_LENGTH, {
                error: "Token de recuperação inválido.",
            }),
        newPassword: passwordSchema,
    },
    { error: "Envie o token e a nova senha." },
);

export const updateProfileSchema = z
    .object(
        {
            name: nameSchema.optional(),
            email: emailSchema.optional(),
            newPassword: passwordSchema.optional(),
            currentPassword: currentPasswordSchema.optional(),
        },
        { error: "Envie os dados do perfil." },
    )
    .refine(hasAnyProfileChange, {
        error: "Informe ao menos um campo para atualizar.",
    })
    .refine(hasCurrentPasswordWhenChangingPassword, {
        error: "Informe a senha atual para alterar a senha.",
        path: ["currentPassword"],
    });

export const profileDetailsFormSchema = z.object({
    name: nameSchema,
    email: emailSchema,
});

export const changePasswordFormSchema = z
    .object({
        currentPassword: currentPasswordSchema,
        newPassword: passwordSchema,
        newPasswordConfirmation: newPasswordConfirmationSchema,
    })
    .refine(hasMatchingNewPasswordConfirmation, NEW_PASSWORD_MISMATCH);

export const resetPasswordFormSchema = z
    .object({
        newPassword: passwordSchema,
        newPasswordConfirmation: newPasswordConfirmationSchema,
    })
    .refine(hasMatchingNewPasswordConfirmation, NEW_PASSWORD_MISMATCH);
