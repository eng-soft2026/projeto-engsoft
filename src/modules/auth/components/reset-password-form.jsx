"use client";

import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button.jsx";
import { FormError } from "../../../components/ui/form-error.jsx";
import { FormField } from "../../../components/ui/form-field.jsx";
import { Input } from "../../../components/ui/input.jsx";
import { useApiForm } from "../../../hooks/use-api-form.js";
import { apiFetch } from "../../../lib/api-client.js";
import { resetPasswordFormSchema } from "../../../schemas/user-schemas.js";
import { PASSWORD_HINT } from "../password-hint.js";

const RESET_PASSWORD_DEFAULT_VALUES = {
    newPassword: "",
    newPasswordConfirmation: "",
};

export function ResetPasswordForm({ token }) {
    const router = useRouter();
    const { form, onSubmit, formError, isSubmitting } = useApiForm({
        schema: resetPasswordFormSchema,
        defaultValues: RESET_PASSWORD_DEFAULT_VALUES,
        submit: ({ newPassword }) =>
            apiFetch("/api/auth/reset-password", {
                method: "POST",
                body: { token, newPassword },
            }),
        successMessage: "Senha redefinida. Entre com a nova senha.",
        onSuccess: () => {
            router.replace("/login");
        },
    });
    const { errors } = form.formState;

    return (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <FormError message={formError} />
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
                Redefinir senha
            </Button>
        </form>
    );
}
