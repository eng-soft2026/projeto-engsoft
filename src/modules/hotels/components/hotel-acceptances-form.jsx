"use client";

import { useFieldArray } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button.jsx";
import { CardTitle } from "../../../components/ui/card.jsx";
import { FormError } from "../../../components/ui/form-error.jsx";
import { FormField } from "../../../components/ui/form-field.jsx";
import { Input } from "../../../components/ui/input.jsx";
import { Select } from "../../../components/ui/select.jsx";
import { useApiForm } from "../../../hooks/use-api-form.js";
import { apiFetch } from "../../../lib/api-client.js";
import {
    ACCEPTANCE_STATUSES,
    MAX_CUSTOM_ACCEPTANCES,
    STANDARD_ACCEPTANCE_TYPES,
    acceptanceFormSchema,
    buildAcceptanceFormValues,
    buildAcceptancesPayload,
    buildEmptyCustomAcceptance,
} from "../acceptance-form.js";

const ALLOWED_OPTIONS = [
    { value: ACCEPTANCE_STATUSES.ALLOWED, label: "Permitido" },
    { value: ACCEPTANCE_STATUSES.NOT_ALLOWED, label: "Não permitido" },
];

const STANDARD_OPTIONS = [
    { value: ACCEPTANCE_STATUSES.UNSET, label: "Não informado" },
    ...ALLOWED_OPTIONS,
];

const ROW_CLASS = "flex flex-col gap-3 sm:grid sm:grid-cols-2";

function StandardAcceptanceRow({ form, index, name }) {
    const errors = form.formState.errors.standard?.[index];

    return (
        <fieldset className="flex flex-col gap-2">
            <legend className="text-foreground mb-2 text-sm font-semibold">
                {name}
            </legend>
            <div className={ROW_CLASS}>
                <FormField label="Situação" error={errors?.status?.message}>
                    <Select
                        options={STANDARD_OPTIONS}
                        {...form.register(`standard.${index}.status`)}
                    />
                </FormField>
                <FormField label="Detalhes" error={errors?.details?.message}>
                    <Input {...form.register(`standard.${index}.details`)} />
                </FormField>
            </div>
        </fieldset>
    );
}

function CustomAcceptanceRow({ form, index, isEditable, onRemove }) {
    const errors = form.formState.errors.custom?.[index];
    const legend = `Regra própria ${index + 1}`;

    return (
        <fieldset className="flex flex-col gap-2">
            <legend className="text-foreground mb-2 text-sm font-semibold">
                {legend}
            </legend>
            <FormField
                label="Rótulo"
                error={errors?.customLabel?.message}
                isRequired
            >
                <Input {...form.register(`custom.${index}.customLabel`)} />
            </FormField>
            <div className={ROW_CLASS}>
                <FormField label="Situação" error={errors?.status?.message}>
                    <Select
                        options={ALLOWED_OPTIONS}
                        {...form.register(`custom.${index}.status`)}
                    />
                </FormField>
                <FormField label="Detalhes" error={errors?.details?.message}>
                    <Input {...form.register(`custom.${index}.details`)} />
                </FormField>
            </div>
            {isEditable && (
                <Button
                    variant="secondary"
                    size="sm"
                    className="self-start"
                    aria-label={`Remover ${legend}`}
                    onClick={onRemove}
                >
                    Remover
                </Button>
            )}
        </fieldset>
    );
}

export function HotelAcceptancesForm({ hotelId, isEditable, acceptances }) {
    const router = useRouter();
    const { form, onSubmit, formError, isSubmitting } = useApiForm({
        schema: acceptanceFormSchema,
        defaultValues: buildAcceptanceFormValues(acceptances),
        submit: (values) =>
            apiFetch(`/api/hotels/${hotelId}/acceptances`, {
                method: "PUT",
                body: buildAcceptancesPayload(values),
            }),
        successMessage: "Regras de aceitação salvas.",
        onSuccess: (stored) => {
            form.reset(buildAcceptanceFormValues(stored));
            router.refresh();
        },
    });
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "custom",
    });
    const canAddCustom = fields.length < MAX_CUSTOM_ACCEPTANCES;

    return (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <CardTitle>Regras de aceitação</CardTitle>
            <FormError message={formError} />
            <fieldset
                disabled={!isEditable}
                className="flex flex-col gap-6 disabled:opacity-70"
            >
                <legend className="sr-only">Regras de aceitação</legend>
                {STANDARD_ACCEPTANCE_TYPES.map(({ code, name }, index) => (
                    <StandardAcceptanceRow
                        key={code}
                        form={form}
                        index={index}
                        name={name}
                    />
                ))}
                {fields.map((field, index) => (
                    <CustomAcceptanceRow
                        key={field.id}
                        form={form}
                        index={index}
                        isEditable={isEditable}
                        onRemove={() => remove(index)}
                    />
                ))}
            </fieldset>
            {isEditable && (
                <div className="flex flex-wrap gap-3">
                    <Button
                        variant="secondary"
                        disabled={!canAddCustom}
                        onClick={() => append(buildEmptyCustomAcceptance())}
                    >
                        Adicionar regra própria
                    </Button>
                    <Button type="submit" isLoading={isSubmitting}>
                        Salvar regras
                    </Button>
                </div>
            )}
        </form>
    );
}
