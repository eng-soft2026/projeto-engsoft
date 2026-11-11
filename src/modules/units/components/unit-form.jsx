"use client";

import { useFieldArray } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/button.jsx";
import { CardTitle } from "../../../components/ui/card.jsx";
import { FormError } from "../../../components/ui/form-error.jsx";
import { FormField } from "../../../components/ui/form-field.jsx";
import { Input } from "../../../components/ui/input.jsx";
import { Select } from "../../../components/ui/select.jsx";
import { useApiForm } from "../../../hooks/use-api-form.js";
import { apiFetch } from "../../../lib/api-client.js";
import { formatPhone } from "../../../utils/brazilian-phone.js";
import { formatZipCode } from "../../../utils/zip-code.js";
import {
    EMPTY_PHONE,
    MAX_UNIT_PHONES,
    MIN_UNIT_PHONES,
    STATE_OPTIONS,
    UNIT_FORM_DEFAULT_VALUES,
    toUnitFormValues,
    toUnitPayload,
    unitFormSchema,
} from "../unit-form.js";
import { buildUnitsHref } from "../unit-routes.js";

const OVERBOOKING_HINT =
    "Percentual inteiro de 0 a 10 sobre os quartos da unidade.";

const GRID_CLASS = "grid gap-4 sm:grid-cols-2";

function registerMasked(form, name, format) {
    const field = form.register(name);
    return {
        ...field,
        onChange: (event) => {
            event.target.value = format(event.target.value);
            return field.onChange(event);
        },
    };
}

function createUnit(hotelId, values) {
    return apiFetch(`/api/hotels/${hotelId}/units`, {
        method: "POST",
        body: toUnitPayload(values),
    });
}

function updateUnit(unitId, values) {
    return apiFetch(`/api/units/${unitId}`, {
        method: "PATCH",
        body: toUnitPayload(values),
    });
}

function PhoneFields({ form }) {
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "phones",
    });
    const phoneErrors = form.formState.errors.phones;
    const canAddPhone = fields.length < MAX_UNIT_PHONES;
    const canRemovePhone = fields.length > MIN_UNIT_PHONES;

    return (
        <section className="flex flex-col gap-3">
            <CardTitle as="h3">Telefones</CardTitle>
            {fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-2">
                    <FormField
                        label={`Telefone ${index + 1}`}
                        error={phoneErrors?.[index]?.value?.message}
                        isRequired
                        className="flex-1"
                    >
                        <Input
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="(11) 91234-5678"
                            {...registerMasked(
                                form,
                                `phones.${index}.value`,
                                formatPhone,
                            )}
                        />
                    </FormField>
                    {canRemovePhone && (
                        <Button
                            variant="ghost"
                            aria-label={`Remover telefone ${index + 1}`}
                            onClick={() => remove(index)}
                        >
                            <Trash2 aria-hidden="true" className="size-4" />
                        </Button>
                    )}
                </div>
            ))}
            {phoneErrors?.root?.message && (
                <p role="alert" className="text-danger text-xs">
                    {phoneErrors.root.message}
                </p>
            )}
            {canAddPhone && (
                <Button
                    variant="secondary"
                    size="sm"
                    className="self-start"
                    onClick={() => append({ ...EMPTY_PHONE })}
                >
                    <Plus aria-hidden="true" className="size-4" />
                    Adicionar telefone
                </Button>
            )}
        </section>
    );
}

function AddressFields({ form }) {
    const errors = form.formState.errors.address ?? {};

    return (
        <section className="flex flex-col gap-3">
            <CardTitle as="h3">Endereço</CardTitle>
            <div className={GRID_CLASS}>
                <FormField
                    label="CEP"
                    error={errors.zipCode?.message}
                    isRequired
                >
                    <Input
                        inputMode="numeric"
                        autoComplete="postal-code"
                        placeholder="00000-000"
                        {...registerMasked(
                            form,
                            "address.zipCode",
                            formatZipCode,
                        )}
                    />
                </FormField>
                <FormField label="UF" error={errors.state?.message} isRequired>
                    <Select
                        options={STATE_OPTIONS}
                        placeholder="Selecione"
                        {...form.register("address.state")}
                    />
                </FormField>
            </div>
            <FormField
                label="Logradouro"
                error={errors.street?.message}
                isRequired
            >
                <Input
                    autoComplete="address-line1"
                    {...form.register("address.street")}
                />
            </FormField>
            <div className={GRID_CLASS}>
                <FormField
                    label="Número"
                    error={errors.number?.message}
                    isRequired
                >
                    <Input {...form.register("address.number")} />
                </FormField>
                <FormField
                    label="Complemento"
                    error={errors.complement?.message}
                >
                    <Input
                        autoComplete="address-line2"
                        {...form.register("address.complement")}
                    />
                </FormField>
            </div>
            <div className={GRID_CLASS}>
                <FormField
                    label="Bairro"
                    error={errors.neighborhood?.message}
                    isRequired
                >
                    <Input {...form.register("address.neighborhood")} />
                </FormField>
                <FormField
                    label="Cidade"
                    error={errors.city?.message}
                    isRequired
                >
                    <Input
                        autoComplete="address-level2"
                        {...form.register("address.city")}
                    />
                </FormField>
            </div>
        </section>
    );
}

function UnitDataFields({ form }) {
    const { errors } = form.formState;

    return (
        <section className="flex flex-col gap-3">
            <FormField label="Nome" error={errors.name?.message} isRequired>
                <Input {...form.register("name")} />
            </FormField>
            <FormField label="E-mail" error={errors.email?.message} isRequired>
                <Input
                    type="email"
                    autoComplete="email"
                    {...form.register("email")}
                />
            </FormField>
            <div className={GRID_CLASS}>
                <FormField
                    label="Check-in"
                    error={errors.checkInTime?.message}
                    isRequired
                >
                    <Input type="time" {...form.register("checkInTime")} />
                </FormField>
                <FormField
                    label="Check-out"
                    error={errors.checkOutTime?.message}
                    isRequired
                >
                    <Input type="time" {...form.register("checkOutTime")} />
                </FormField>
            </div>
            <FormField
                label="Overbooking (%)"
                hint={OVERBOOKING_HINT}
                error={errors.overbookingPercentage?.message}
                isRequired
            >
                <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={10}
                    step={1}
                    {...form.register("overbookingPercentage", {
                        valueAsNumber: true,
                    })}
                />
            </FormField>
        </section>
    );
}

export function UnitForm({ hotelId, unit, isEditable }) {
    const router = useRouter();
    const isNewUnit = !unit;
    const { form, onSubmit, formError, isSubmitting } = useApiForm({
        schema: unitFormSchema,
        defaultValues: isNewUnit
            ? UNIT_FORM_DEFAULT_VALUES
            : toUnitFormValues(unit),
        submit: (values) =>
            isNewUnit
                ? createUnit(hotelId, values)
                : updateUnit(unit.id, values),
        successMessage: isNewUnit
            ? "Unidade cadastrada."
            : "Unidade atualizada.",
        onSuccess: () => {
            if (isNewUnit) {
                router.push(buildUnitsHref(hotelId));
            }
            router.refresh();
        },
    });

    return (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
            <FormError message={formError} />
            <fieldset
                disabled={!isEditable}
                className="flex min-w-0 flex-col gap-6"
            >
                <UnitDataFields form={form} />
                <AddressFields form={form} />
                <PhoneFields form={form} />
            </fieldset>
            {isEditable && (
                <Button
                    type="submit"
                    isLoading={isSubmitting}
                    className="self-start"
                >
                    {isNewUnit ? "Cadastrar unidade" : "Salvar unidade"}
                </Button>
            )}
        </form>
    );
}
