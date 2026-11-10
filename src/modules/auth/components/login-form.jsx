"use client";

import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button.jsx";
import { FormError } from "../../../components/ui/form-error.jsx";
import { FormField } from "../../../components/ui/form-field.jsx";
import { Input } from "../../../components/ui/input.jsx";
import { useApiForm } from "../../../hooks/use-api-form.js";
import { apiFetch } from "../../../lib/api-client.js";
import { loginSchema } from "../../../schemas/user-schemas.js";
import { resolveCallbackUrl } from "../callback-url.js";

const LOGIN_DEFAULT_VALUES = { email: "", password: "" };

function sendLogin(values) {
    return apiFetch("/api/auth/login", { method: "POST", body: values });
}

export function LoginForm({ callbackUrl }) {
    const router = useRouter();
    const { form, onSubmit, formError, isSubmitting } = useApiForm({
        schema: loginSchema,
        defaultValues: LOGIN_DEFAULT_VALUES,
        submit: sendLogin,
        onSuccess: () => {
            router.replace(resolveCallbackUrl(callbackUrl));
            router.refresh();
        },
    });
    const { errors } = form.formState;

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
            <FormField
                label="Senha"
                error={errors.password?.message}
                isRequired
            >
                <Input
                    type="password"
                    autoComplete="current-password"
                    {...form.register("password")}
                />
            </FormField>
            <Button type="submit" isLoading={isSubmitting}>
                Entrar
            </Button>
        </form>
    );
}
