"use client";

import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button.jsx";
import { FormError } from "../../../components/ui/form-error.jsx";
import { useApiForm } from "../../../hooks/use-api-form.js";
import { apiFetch } from "../../../lib/api-client.js";
import { ERROR_CODES } from "../../../lib/errors.js";
import { updateHotelSchema } from "../../../schemas/hotel-schemas.js";
import { formatCnpj } from "../../../utils/cnpj.js";
import { isHotelEditable } from "../hotel-editability.js";
import { HotelFormFields } from "./hotel-form-fields.jsx";

const EDIT_HOTEL_FIELD_ERROR_CODES = {
    [ERROR_CODES.INVALID_CNPJ]: "cnpj",
};

export function buildEditHotelDefaultValues(hotel) {
    return {
        name: hotel.name,
        description: hotel.description,
        category: hotel.category,
        cnpj: formatCnpj(hotel.cnpj),
        email: hotel.email,
    };
}

export function EditHotelForm({ hotel }) {
    const router = useRouter();
    const isEditable = isHotelEditable(hotel.status);
    const { form, onSubmit, formError, isSubmitting } = useApiForm({
        schema: updateHotelSchema,
        defaultValues: buildEditHotelDefaultValues(hotel),
        submit: (values) =>
            apiFetch(`/api/hotels/${hotel.id}`, {
                method: "PATCH",
                body: values,
            }),
        successMessage: "Dados do hotel atualizados.",
        fieldErrorCodes: EDIT_HOTEL_FIELD_ERROR_CODES,
        onSuccess: () => router.refresh(),
    });

    return (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <FormError message={formError} />
            <fieldset
                disabled={!isEditable}
                className="flex flex-col gap-4 disabled:opacity-70"
            >
                <legend className="sr-only">Dados do hotel</legend>
                <HotelFormFields form={form} />
            </fieldset>
            {isEditable && (
                <Button type="submit" isLoading={isSubmitting}>
                    Salvar alterações
                </Button>
            )}
        </form>
    );
}
