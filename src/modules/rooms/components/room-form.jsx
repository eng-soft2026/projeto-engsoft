"use client";

import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button.jsx";
import { Checkbox } from "../../../components/ui/checkbox.jsx";
import { FormError } from "../../../components/ui/form-error.jsx";
import { FormField } from "../../../components/ui/form-field.jsx";
import { Input } from "../../../components/ui/input.jsx";
import { Select } from "../../../components/ui/select.jsx";
import { Textarea } from "../../../components/ui/textarea.jsx";
import { useApiForm } from "../../../hooks/use-api-form.js";
import { apiFetch } from "../../../lib/api-client.js";
import { ERROR_CODES } from "../../../lib/errors.js";
import {
    MAX_ROOM_FLOOR,
    MIN_ROOM_FLOOR,
    ROOM_FORM_DEFAULT_VALUES,
    roomFormSchema,
    roomOperationFormSchema,
    toCreateRoomPayload,
    toRoomFormValues,
    toRoomOperationPayload,
    toUpdateRoomPayload,
} from "../room-form.js";
import { MANUAL_ROOM_STATUS_OPTIONS } from "../room-labels.js";
import { buildRoomsHref } from "../room-routes.js";

const ROOM_FIELD_ERROR_CODES = Object.freeze({
    [ERROR_CODES.ROOM_NUMBER_ALREADY_EXISTS]: "number",
});

const OPERATION_ONLY_HINT =
    "Com o hotel publicado, apenas status, observações e preço podem ser alterados.";

const PRICE_HINT = "Use até 2 casas decimais, com vírgula ou ponto.";

const GRID_CLASS = "grid gap-4 sm:grid-cols-2";

function createRoom(unitId, values) {
    return apiFetch(`/api/units/${unitId}/rooms`, {
        method: "POST",
        body: toCreateRoomPayload(values),
    });
}

function updateRoom(roomId, payload) {
    return apiFetch(`/api/rooms/${roomId}`, {
        method: "PATCH",
        body: payload,
    });
}

function RoomStructureFields({ form, roomTypeOptions }) {
    const { errors } = form.formState;

    return (
        <section className="flex flex-col gap-3">
            <FormField
                label="Tipo de acomodação"
                error={errors.roomTypeId?.message}
                isRequired
            >
                <Select
                    options={roomTypeOptions}
                    placeholder="Selecione"
                    {...form.register("roomTypeId")}
                />
            </FormField>
            <div className={GRID_CLASS}>
                <FormField
                    label="Número"
                    error={errors.number?.message}
                    isRequired
                >
                    <Input {...form.register("number")} />
                </FormField>
                <FormField
                    label="Andar"
                    hint="Use 0 para o térreo."
                    error={errors.floor?.message}
                    isRequired
                >
                    <Input
                        type="number"
                        inputMode="numeric"
                        min={MIN_ROOM_FLOOR}
                        max={MAX_ROOM_FLOOR}
                        step={1}
                        {...form.register("floor", { valueAsNumber: true })}
                    />
                </FormField>
            </div>
            <Checkbox
                label="Quarto acessível"
                {...form.register("isAccessible")}
            />
        </section>
    );
}

function RoomPriceFields({ form }) {
    const usesTypePrice = form.watch("usesTypePrice");

    return (
        <section className="flex flex-col gap-3">
            <Checkbox
                label="Usar o preço padrão do tipo"
                {...form.register("usesTypePrice")}
            />
            {!usesTypePrice && (
                <FormField
                    label="Preço próprio por noite (R$)"
                    hint={PRICE_HINT}
                    error={form.formState.errors.price?.message}
                    isRequired
                >
                    <Input
                        inputMode="decimal"
                        placeholder="350,00"
                        {...form.register("price")}
                    />
                </FormField>
            )}
        </section>
    );
}

function RoomOperationFields({ form }) {
    const { errors } = form.formState;

    return (
        <section className="flex flex-col gap-3">
            <FormField label="Status" error={errors.status?.message} isRequired>
                <Select
                    options={MANUAL_ROOM_STATUS_OPTIONS}
                    placeholder="Selecione"
                    {...form.register("status")}
                />
            </FormField>
            <FormField
                label="Observações administrativas"
                hint="Visíveis apenas para os gestores do hotel."
                error={errors.administrativeNotes?.message}
            >
                <Textarea {...form.register("administrativeNotes")} />
            </FormField>
            <RoomPriceFields form={form} />
        </section>
    );
}

function buildRoomPayload(room, values, isOperationOnly) {
    if (isOperationOnly) {
        return toRoomOperationPayload(values);
    }
    return toUpdateRoomPayload(values, room.roomTypeId);
}

export function RoomForm({
    hotelId,
    unitId,
    room,
    roomTypeOptions,
    isStructureEditable,
    isOperationEditable,
}) {
    const router = useRouter();
    const isNewRoom = !room;
    const isOperationOnly = !isStructureEditable && isOperationEditable;
    const canSubmit = isStructureEditable || isOperationEditable;
    const { form, onSubmit, formError, isSubmitting } = useApiForm({
        schema: isOperationOnly ? roomOperationFormSchema : roomFormSchema,
        defaultValues: isNewRoom
            ? ROOM_FORM_DEFAULT_VALUES
            : toRoomFormValues(room),
        fieldErrorCodes: ROOM_FIELD_ERROR_CODES,
        submit: (values) => {
            if (isNewRoom) {
                return createRoom(unitId, values);
            }
            return updateRoom(
                room.id,
                buildRoomPayload(room, values, isOperationOnly),
            );
        },
        successMessage: isNewRoom ? "Quarto cadastrado." : "Quarto atualizado.",
        onSuccess: () => {
            if (isNewRoom) {
                router.push(buildRoomsHref(hotelId, { unitId }));
            }
            router.refresh();
        },
    });

    return (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
            <FormError message={formError} />
            {isOperationOnly && (
                <p className="text-muted-foreground text-sm">
                    {OPERATION_ONLY_HINT}
                </p>
            )}
            <fieldset
                disabled={!isStructureEditable}
                className="flex min-w-0 flex-col"
            >
                <RoomStructureFields
                    form={form}
                    roomTypeOptions={roomTypeOptions}
                />
            </fieldset>
            <fieldset disabled={!canSubmit} className="flex min-w-0 flex-col">
                <RoomOperationFields form={form} />
            </fieldset>
            {canSubmit && (
                <Button
                    type="submit"
                    isLoading={isSubmitting}
                    className="self-start"
                >
                    {isNewRoom ? "Cadastrar quarto" : "Salvar quarto"}
                </Button>
            )}
        </form>
    );
}
