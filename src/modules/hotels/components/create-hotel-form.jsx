"use client";

import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button.jsx";
import { FormError } from "../../../components/ui/form-error.jsx";
import { useApiForm } from "../../../hooks/use-api-form.js";
import { apiFetch } from "../../../lib/api-client.js";
import { ERROR_CODES } from "../../../lib/errors.js";
import { createHotelSchema } from "../../../schemas/hotel-schemas.js";
import { MANAGED_HOTELS_HREF } from "../managed-hotel-routes.js";
import { HotelFormFields } from "./hotel-form-fields.jsx";

export { MANAGED_HOTELS_HREF };

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

    return (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <FormError message={formError} />
            <HotelFormFields form={form} />
            <Button type="submit" isLoading={isSubmitting}>
                Cadastrar hotel
            </Button>
        </form>
    );
}
