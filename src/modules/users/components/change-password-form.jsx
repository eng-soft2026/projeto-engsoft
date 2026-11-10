"use client";

import { Button } from "../../../components/ui/button.jsx";
import { FormError } from "../../../components/ui/form-error.jsx";
import { FormField } from "../../../components/ui/form-field.jsx";
import { Input } from "../../../components/ui/input.jsx";
import { useApiForm } from "../../../hooks/use-api-form.js";
import { apiFetch } from "../../../lib/api-client.js";
import { ERROR_CODES } from "../../../lib/errors.js";
import { changePasswordFormSchema } from "../../../schemas/user-schemas.js";
import { PASSWORD_HINT } from "../../auth/password-hint.js";

const CHANGE_PASSWORD_DEFAULT_VALUES = {
    currentPassword: "",
    newPassword: "",
    newPasswordConfirmation: "",
};

const CHANGE_PASSWORD_FIELD_ERROR_CODES = {
    [ERROR_CODES.INVALID_CREDENTIALS]: "currentPassword",
};

function sendPasswordChange({ currentPassword, newPassword }) {
    return apiFetch("/api/users/me", {
        method: "PATCH",
        body: { currentPassword, newPassword },
    });
}

export function ChangePasswordForm() {
    const { form, onSubmit, formError, isSubmitting } = useApiForm({
        schema: changePasswordFormSchema,
        defaultValues: CHANGE_PASSWORD_DEFAULT_VALUES,
        submit: sendPasswordChange,
        successMessage: "Senha alterada.",
        fieldErrorCodes: CHANGE_PASSWORD_FIELD_ERROR_CODES,
        onSuccess: () => form.reset(CHANGE_PASSWORD_DEFAULT_VALUES),
    });
    const { errors } = form.formState;

    return (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <FormError message={formError} />
            <FormField
                label="Senha atual"
                error={errors.currentPassword?.message}
                isRequired
            >
                <Input
                    type="password"
                    autoComplete="current-password"
                    {...form.register("currentPassword")}
                />
            </FormField>
            <FormField
                label="Nova senha"
                hint={PASSWORD_HINT}
                error={errors.newPassword?.message}
                isRequired
            >
                <Input
                    type="password"
                    autoComplete="new-password"
                    {...form.register("newPassword")}
                />
            </FormField>
            <FormField
                label="Confirmar nova senha"
                error={errors.newPasswordConfirmation?.message}
                isRequired
            >
                <Input
                    type="password"
                    autoComplete="new-password"
                    {...form.register("newPasswordConfirmation")}
                />
            </FormField>
            <Button type="submit" isLoading={isSubmitting}>
                Alterar senha
            </Button>
        </form>
    );
}
