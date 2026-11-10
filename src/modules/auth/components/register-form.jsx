"use client";

import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button.jsx";
import { FormError } from "../../../components/ui/form-error.jsx";
import { FormField } from "../../../components/ui/form-field.jsx";
import { Input } from "../../../components/ui/input.jsx";
import { Select } from "../../../components/ui/select.jsx";
import { USER_ROLES } from "../../../constants/user-roles.js";
import { useApiForm } from "../../../hooks/use-api-form.js";
import { apiFetch } from "../../../lib/api-client.js";
import { ERROR_CODES } from "../../../lib/errors.js";
import { registerFormSchema } from "../../../schemas/user-schemas.js";
import { buildAuthPageHref } from "../callback-url.js";
import { PASSWORD_HINT } from "../password-hint.js";

const REGISTER_DEFAULT_VALUES = {
    name: "",
    email: "",
    cpf: "",
    password: "",
    passwordConfirmation: "",
    role: USER_ROLES.CUSTOMER,
};

const ROLE_OPTIONS = [
    { value: USER_ROLES.CUSTOMER, label: "Cliente (quero reservar)" },
    { value: USER_ROLES.MANAGER, label: "Gestor de hotel" },
];

const REGISTER_FIELD_ERROR_CODES = {
    [ERROR_CODES.USER_ALREADY_EXISTS]: "email",
    [ERROR_CODES.INVALID_CPF]: "cpf",
};

function sendRegistration({ name, email, cpf, password, role }) {
    return apiFetch("/api/auth/register", {
        method: "POST",
        body: { name, email, cpf, password, role },
    });
}

export function RegisterForm({ callbackUrl }) {
    const router = useRouter();
    const { form, onSubmit, formError, isSubmitting } = useApiForm({
        schema: registerFormSchema,
        defaultValues: REGISTER_DEFAULT_VALUES,
        submit: sendRegistration,
        successMessage: "Conta criada. Entre para continuar.",
        fieldErrorCodes: REGISTER_FIELD_ERROR_CODES,
        onSuccess: () => {
            router.push(buildAuthPageHref("/login", callbackUrl));
        },
    });
    const { errors } = form.formState;

    return (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <FormError message={formError} />
            <FormField label="Nome" error={errors.name?.message} isRequired>
                <Input autoComplete="name" {...form.register("name")} />
            </FormField>
            <FormField label="E-mail" error={errors.email?.message} isRequired>
                <Input
                    type="email"
                    autoComplete="email"
                    {...form.register("email")}
                />
            </FormField>
            <FormField
                label="CPF"
                hint="Com ou sem pontuação."
                error={errors.cpf?.message}
                isRequired
            >
                <Input
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    {...form.register("cpf")}
                />
            </FormField>
            <FormField
                label="Senha"
                hint={PASSWORD_HINT}
                error={errors.password?.message}
                isRequired
            >
                <Input
                    type="password"
                    autoComplete="new-password"
                    {...form.register("password")}
                />
            </FormField>
            <FormField
                label="Confirmar senha"
                error={errors.passwordConfirmation?.message}
                isRequired
            >
                <Input
                    type="password"
                    autoComplete="new-password"
                    {...form.register("passwordConfirmation")}
                />
            </FormField>
            <FormField
                label="Tipo de conta"
                error={errors.role?.message}
                isRequired
            >
                <Select options={ROLE_OPTIONS} {...form.register("role")} />
            </FormField>
            <Button type="submit" isLoading={isSubmitting}>
                Criar conta
            </Button>
        </form>
    );
}
