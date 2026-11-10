"use client";

import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "../../../components/ui/button.jsx";
import { FormError } from "../../../components/ui/form-error.jsx";
import { FormField } from "../../../components/ui/form-field.jsx";
import { Input } from "../../../components/ui/input.jsx";
import { useApiForm } from "../../../hooks/use-api-form.js";
import { apiFetch } from "../../../lib/api-client.js";
import { forgotPasswordSchema } from "../../../schemas/user-schemas.js";
import { FORGOT_PASSWORD_SENT_MESSAGE } from "../password-reset-messages.js";

const FORGOT_PASSWORD_DEFAULT_VALUES = { email: "" };

function sendForgotPassword(values) {
    return apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: values,
    });
}

export function ForgotPasswordForm() {
    const [isSent, setIsSent] = useState(false);
    const { form, onSubmit, formError, isSubmitting } = useApiForm({
        schema: forgotPasswordSchema,
        defaultValues: FORGOT_PASSWORD_DEFAULT_VALUES,
        submit: sendForgotPassword,
        onSuccess: () => setIsSent(true),
    });
    const { errors } = form.formState;

    if (isSent) {
        return (
            <p
                role="status"
                className="rounded-control border-border bg-primary-soft text-foreground flex items-start gap-2 border px-3 py-2 text-sm"
            >
                <MailCheck
                    aria-hidden="true"
                    className="text-primary mt-0.5 size-4 shrink-0"
                />
                {FORGOT_PASSWORD_SENT_MESSAGE}
            </p>
        );
    }

    return (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <FormError message={formError} />
            <FormField label="E-mail" error={errors.email?.message} isRequired>
                <Input
                    type="email"
                    autoComplete="email"
                    {...form.register("email")}
                />
            </FormField>
            <Button type="submit" isLoading={isSubmitting}>
                Enviar instruções
            </Button>
        </form>
    );
}
