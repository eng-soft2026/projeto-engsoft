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
import { Textarea } from "../../../components/ui/textarea.jsx";
import { useApiForm } from "../../../hooks/use-api-form.js";
import { apiFetch } from "../../../lib/api-client.js";
import {
    EMPTY_BED,
    MAX_BED_QUANTITY,
    MAX_BED_ROWS,
    MIN_BED_QUANTITY,
    MIN_ROOM_TYPE_BEDS,
    ROOM_TYPE_FORM_DEFAULT_VALUES,
    roomTypeFormSchema,
    roomTypePriceFormSchema,
    toRoomTypeFormValues,
    toRoomTypePayload,
    toRoomTypePricePayload,
} from "../room-type-form.js";
import { BED_TYPE_OPTIONS } from "../room-type-labels.js";
import { buildRoomTypesHref } from "../room-type-routes.js";

const DECIMAL_HINT = "Use até 2 casas decimais, com vírgula ou ponto.";

const PRICE_ONLY_HINT =
    "Com o hotel publicado, apenas o preço padrão pode ser alterado.";

const GRID_CLASS = "grid gap-4 sm:grid-cols-2";

function createRoomType(hotelId, values) {
    return apiFetch(`/api/hotels/${hotelId}/room-types`, {
        method: "POST",
        body: toRoomTypePayload(values),
    });
}

function updateRoomType(roomTypeId, payload) {
    return apiFetch(`/api/room-types/${roomTypeId}`, {
        method: "PATCH",
        body: payload,
    });
}

function BedFields({ form }) {
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "beds",
    });
    const bedErrors = form.formState.errors.beds;
    const canAddBed = fields.length < MAX_BED_ROWS;
    const canRemoveBed = fields.length > MIN_ROOM_TYPE_BEDS;

    return (
        <section className="flex flex-col gap-3">
            <CardTitle as="h3">Camas</CardTitle>
            {fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-2">
                    <FormField
                        label={`Tipo de cama ${index + 1}`}
                        error={bedErrors?.[index]?.bedType?.message}
                        isRequired
                        className="flex-1"
                    >
                        <Select
                            options={BED_TYPE_OPTIONS}
                            placeholder="Selecione"
                            {...form.register(`beds.${index}.bedType`)}
                        />
                    </FormField>
                    <FormField
                        label={`Quantidade ${index + 1}`}
                        error={bedErrors?.[index]?.quantity?.message}
                        isRequired
                        className="w-28"
                    >
                        <Input
                            type="number"
                            inputMode="numeric"
                            min={MIN_BED_QUANTITY}
                            max={MAX_BED_QUANTITY}
                            step={1}
                            {...form.register(`beds.${index}.quantity`, {
                                valueAsNumber: true,
                            })}
                        />
                    </FormField>
                    {canRemoveBed && (
                        <Button
                            variant="ghost"
                            aria-label={`Remover cama ${index + 1}`}
                            onClick={() => remove(index)}
                        >
                            <Trash2 aria-hidden="true" className="size-4" />
                        </Button>
                    )}
                </div>
            ))}
            {bedErrors?.root?.message && (
                <p role="alert" className="text-danger text-xs">
                    {bedErrors.root.message}
                </p>
            )}
            {canAddBed && (
                <Button
                    variant="secondary"
                    size="sm"
                    className="self-start"
                    onClick={() => append({ ...EMPTY_BED })}
                >
                    <Plus aria-hidden="true" className="size-4" />
                    Adicionar cama
                </Button>
            )}
        </section>
    );
}

function RoomTypeDataFields({ form }) {
    const { errors } = form.formState;

    return (
        <section className="flex flex-col gap-3">
            <FormField label="Nome" error={errors.name?.message} isRequired>
                <Input {...form.register("name")} />
            </FormField>
            <FormField
                label="Descrição"
                error={errors.description?.message}
                isRequired
            >
                <Textarea {...form.register("description")} />
            </FormField>
            <div className={GRID_CLASS}>
                <FormField
                    label="Capacidade (hóspedes)"
                    error={errors.maxGuests?.message}
                    isRequired
                >
                    <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        {...form.register("maxGuests", {
                            valueAsNumber: true,
                        })}
                    />
                </FormField>
                <FormField
                    label="Área (m²)"
                    hint={DECIMAL_HINT}
                    error={errors.areaM2?.message}
                    isRequired
                >
                    <Input
                        inputMode="decimal"
                        placeholder="25,50"
                        {...form.register("areaM2")}
                    />
                </FormField>
            </div>
        </section>
    );
}

function PriceField({ form, isPriceOnly }) {
    return (
        <FormField
            label="Preço padrão (R$)"
            hint={isPriceOnly ? PRICE_ONLY_HINT : DECIMAL_HINT}
            error={form.formState.errors.defaultPrice?.message}
            isRequired
        >
            <Input
                inputMode="decimal"
                placeholder="350,00"
                {...form.register("defaultPrice")}
            />
        </FormField>
    );
}

export function RoomTypeForm({
    hotelId,
    roomType,
    isStructureEditable,
    isPriceEditable,
}) {
    const router = useRouter();
    const isNewRoomType = !roomType;
    const isPriceOnly = !isStructureEditable && isPriceEditable;
    const canSubmit = isStructureEditable || isPriceEditable;
    const { form, onSubmit, formError, isSubmitting } = useApiForm({
        schema: isPriceOnly ? roomTypePriceFormSchema : roomTypeFormSchema,
        defaultValues: isNewRoomType
            ? ROOM_TYPE_FORM_DEFAULT_VALUES
            : toRoomTypeFormValues(roomType),
        submit: (values) => {
            if (isNewRoomType) {
                return createRoomType(hotelId, values);
            }
            return updateRoomType(
                roomType.id,
                isPriceOnly
                    ? toRoomTypePricePayload(values)
                    : toRoomTypePayload(values),
            );
        },
        successMessage: isNewRoomType
            ? "Tipo de acomodação cadastrado."
            : "Tipo de acomodação atualizado.",
        onSuccess: () => {
            if (isNewRoomType) {
                router.push(buildRoomTypesHref(hotelId));
            }
            router.refresh();
        },
    });

    return (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
            <FormError message={formError} />
            <fieldset
                disabled={!isStructureEditable}
                className="flex min-w-0 flex-col gap-6"
            >
                <RoomTypeDataFields form={form} />
                <BedFields form={form} />
            </fieldset>
            <fieldset disabled={!canSubmit} className="flex min-w-0 flex-col">
                <PriceField form={form} isPriceOnly={isPriceOnly} />
            </fieldset>
            {canSubmit && (
                <Button
                    type="submit"
                    isLoading={isSubmitting}
                    className="self-start"
                >
                    {isNewRoomType ? "Cadastrar tipo" : "Salvar tipo"}
                </Button>
            )}
        </form>
    );
}
