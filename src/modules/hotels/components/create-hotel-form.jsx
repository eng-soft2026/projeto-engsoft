"use client";

import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button.jsx";
import { FormError } from "../../../components/ui/form-error.jsx";
import { FormField } from "../../../components/ui/form-field.jsx";
import { Input } from "../../../components/ui/input.jsx";
import { Textarea } from "../../../components/ui/textarea.jsx";
import { useApiForm } from "../../../hooks/use-api-form.js";
import { apiFetch } from "../../../lib/api-client.js";
import { ERROR_CODES } from "../../../lib/errors.js";
import { createHotelSchema } from "../../../schemas/hotel-schemas.js";
import { formatCnpj } from "../../../utils/cnpj.js";

export const MANAGED_HOTELS_HREF = "/manager/hotels";

const CREATE_HOTEL_DEFAULT_VALUES = Object.freeze({
    name: "",
    description: "",
    category: "",
    cnpj: "",
    email: "",
});

const CREATE_HOTEL_FIELD_ERROR_CODES = {
    [ERROR_CODES.INVALID_CNPJ]: "cnpj",
};

function sendHotel(values) {
    return apiFetch("/api/hotels", { method: "POST", body: values });
}

export function CreateHotelForm() {
    const router = useRouter();
    const { form, onSubmit, formError, isSubmitting } = useApiForm({
        schema: createHotelSchema,
        defaultValues: CREATE_HOTEL_DEFAULT_VALUES,
        submit: sendHotel,
        successMessage: "Hotel cadastrado como rascunho.",
        fieldErrorCodes: CREATE_HOTEL_FIELD_ERROR_CODES,
        onSuccess: () => {
            router.push(MANAGED_HOTELS_HREF);
            router.refresh();
        },
    });
    const { errors } = form.formState;
    const cnpjField = form.register("cnpj");

    function changeCnpj(event) {
        event.target.value = formatCnpj(event.target.value);
        return cnpjField.onChange(event);
    }

    return (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <FormError message={formError} />
            <FormField
                label="Nome do hotel"
                error={errors.name?.message}
                isRequired
            >
                <Input autoComplete="organization" {...form.register("name")} />
            </FormField>
            <FormField
                label="Descrição"
                error={errors.description?.message}
                isRequired
            >
                <Textarea rows={5} {...form.register("description")} />
            </FormField>
            <FormField
                label="Categoria"
                hint="Por exemplo: pousada, resort, hotel urbano."
                error={errors.category?.message}
                isRequired
            >
                <Input {...form.register("category")} />
            </FormField>
            <FormField
                label="CNPJ"
                hint="Aceita CNPJ numérico ou alfanumérico."
                error={errors.cnpj?.message}
                isRequired
            >
                <Input
                    inputMode="text"
                    autoCapitalize="characters"
                    placeholder="00.000.000/0000-00"
                    {...cnpjField}
                    onChange={changeCnpj}
                />
            </FormField>
            <FormField
                label="E-mail do hotel"
                error={errors.email?.message}
                isRequired
            >
                <Input
                    type="email"
                    autoComplete="email"
                    {...form.register("email")}
                />
            </FormField>
            <Button type="submit" isLoading={isSubmitting}>
                Cadastrar hotel
            </Button>
        </form>
    );
}
