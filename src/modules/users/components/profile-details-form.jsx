"use client";

import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button.jsx";
import { FormError } from "../../../components/ui/form-error.jsx";
import { FormField } from "../../../components/ui/form-field.jsx";
import { Input } from "../../../components/ui/input.jsx";
import { useApiForm } from "../../../hooks/use-api-form.js";
import { apiFetch } from "../../../lib/api-client.js";
import { ERROR_CODES } from "../../../lib/errors.js";
import { profileDetailsFormSchema } from "../../../schemas/user-schemas.js";

const PROFILE_FIELD_ERROR_CODES = {
    [ERROR_CODES.USER_ALREADY_EXISTS]: "email",
};

function sendProfileDetails(values) {
    return apiFetch("/api/users/me", { method: "PATCH", body: values });
}

export function ProfileDetailsForm({ user }) {
    const router = useRouter();
    const { form, onSubmit, formError, isSubmitting } = useApiForm({
        schema: profileDetailsFormSchema,
        defaultValues: { name: user.name, email: user.email },
        submit: sendProfileDetails,
        successMessage: "Dados atualizados.",
        fieldErrorCodes: PROFILE_FIELD_ERROR_CODES,
        onSuccess: (updatedUser) => {
            form.reset({ name: updatedUser.name, email: updatedUser.email });
            router.refresh();
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
            <Button type="submit" isLoading={isSubmitting}>
                Salvar dados
            </Button>
        </form>
    );
}
