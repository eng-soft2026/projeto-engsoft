"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "../../../components/ui/badge.jsx";
import { Button } from "../../../components/ui/button.jsx";
import { CardTitle } from "../../../components/ui/card.jsx";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog.jsx";
import { EmptyState } from "../../../components/ui/empty-state.jsx";
import { FormError } from "../../../components/ui/form-error.jsx";
import { FormField } from "../../../components/ui/form-field.jsx";
import { Input } from "../../../components/ui/input.jsx";
import { useApiForm } from "../../../hooks/use-api-form.js";
import { apiFetch } from "../../../lib/api-client.js";
import { ERROR_CODES } from "../../../lib/errors.js";
import { resolveErrorMessage } from "../../../lib/error-messages.js";
import { formatCalendarDate } from "../../../utils/calendar-date.js";
import { formatPrice } from "../../room-types/room-type-labels.js";
import {
    PRICE_PERIOD_FORM_DEFAULT_VALUES,
    createPricePeriodFormSchema,
    hasPricePeriodStarted,
    toPricePeriodFormValues,
} from "../price-period-form.js";

const PERIOD_FIELD_ERROR_CODES = Object.freeze({
    [ERROR_CODES.PRICE_PERIOD_OVERLAP]: "startDate",
});

function describePeriod(period) {
    return `${formatCalendarDate(period.startDate)} a ${formatCalendarDate(period.endDate)}`;
}

function PricePeriodForm({
    today,
    defaultValues,
    submit,
    successMessage,
    submitLabel,
    onDone,
    onCancel,
}) {
    const router = useRouter();
    const { form, onSubmit, formError, isSubmitting } = useApiForm({
        schema: createPricePeriodFormSchema(today),
        defaultValues,
        submit,
        successMessage,
        fieldErrorCodes: PERIOD_FIELD_ERROR_CODES,
        onSuccess: () => {
            form.reset(defaultValues);
            onDone?.();
            router.refresh();
        },
    });
    const { errors } = form.formState;

    return (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <FormError message={formError} />
            <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                    label="Data inicial"
                    error={errors.startDate?.message}
                    isRequired
                >
                    <Input
                        type="date"
                        min={today}
                        {...form.register("startDate")}
                    />
                </FormField>
                <FormField
                    label="Data final"
                    error={errors.endDate?.message}
                    isRequired
                >
                    <Input
                        type="date"
                        min={today}
                        {...form.register("endDate")}
                    />
                </FormField>
                <FormField
                    label="Preço por noite (R$)"
                    error={errors.price?.message}
                    isRequired
                >
                    <Input
                        inputMode="decimal"
                        placeholder="350,00"
                        {...form.register("price")}
                    />
                </FormField>
            </div>
            <div className="flex flex-wrap gap-3">
                <Button type="submit" isLoading={isSubmitting}>
                    {submitLabel}
                </Button>
                {onCancel && (
                    <Button variant="secondary" onClick={onCancel}>
                        Cancelar
                    </Button>
                )}
            </div>
        </form>
    );
}

function DeletePricePeriodButton({ period }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const label = describePeriod(period);

    async function deletePeriod() {
        setIsDeleting(true);
        try {
            await apiFetch(`/api/price-periods/${period.id}`, {
                method: "DELETE",
            });
        } catch (error) {
            toast.error(resolveErrorMessage(error));
            setIsDeleting(false);
            return;
        }

        toast.success("Período excluído.");
        setIsDeleting(false);
        setIsOpen(false);
        router.refresh();
    }

    return (
        <>
            <Button
                variant="secondary"
                size="sm"
                aria-label={`Excluir período ${label}`}
                onClick={() => setIsOpen(true)}
            >
                Excluir
            </Button>
            <ConfirmDialog
                isOpen={isOpen}
                title="Excluir período de preço?"
                description={`O período ${label} deixará de valer para este quarto.`}
                confirmLabel="Excluir"
                isConfirming={isDeleting}
                onConfirm={deletePeriod}
                onCancel={() => setIsOpen(false)}
            />
        </>
    );
}

function PricePeriodItem({ period, today, isEditable }) {
    const [isEditing, setIsEditing] = useState(false);
    const isStarted = hasPricePeriodStarted(period, today);
    const label = describePeriod(period);

    if (isEditing) {
        return (
            <li className="py-3">
                <PricePeriodForm
                    today={today}
                    defaultValues={toPricePeriodFormValues(period)}
                    submit={(values) =>
                        apiFetch(`/api/price-periods/${period.id}`, {
                            method: "PATCH",
                            body: values,
                        })
                    }
                    successMessage="Período atualizado."
                    submitLabel="Salvar período"
                    onDone={() => setIsEditing(false)}
                    onCancel={() => setIsEditing(false)}
                />
            </li>
        );
    }

    return (
        <li className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-foreground text-sm font-medium">
                        {label}
                    </p>
                    {isStarted && <Badge>Iniciado</Badge>}
                </div>
                <p className="text-muted-foreground text-sm">
                    {formatPrice(period.price)} por noite
                </p>
            </div>
            {isEditable && !isStarted && (
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Editar período ${label}`}
                        onClick={() => setIsEditing(true)}
                    >
                        Editar
                    </Button>
                    <DeletePricePeriodButton period={period} />
                </div>
            )}
        </li>
    );
}

export function RoomPricePeriodsPanel({ roomId, periods, today, isEditable }) {
    return (
        <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3">
                <CardTitle>Preços por período</CardTitle>
                <p className="text-muted-foreground text-sm">
                    O preço do período vale para as noites entre as datas,
                    inclusive, e tem prioridade sobre o preço do quarto e do
                    tipo. Períodos já iniciados não podem ser alterados.
                </p>
                {periods.length === 0 ? (
                    <EmptyState
                        title="Nenhum período cadastrado"
                        description="Cadastre períodos para cobrar preços diferentes em datas específicas."
                    />
                ) : (
                    <ul className="divide-border flex flex-col divide-y">
                        {periods.map((period) => (
                            <PricePeriodItem
                                key={period.id}
                                period={period}
                                today={today}
                                isEditable={isEditable}
                            />
                        ))}
                    </ul>
                )}
            </section>
            {isEditable && (
                <section className="flex flex-col gap-3">
                    <CardTitle as="h3">Novo período</CardTitle>
                    <PricePeriodForm
                        today={today}
                        defaultValues={PRICE_PERIOD_FORM_DEFAULT_VALUES}
                        submit={(values) =>
                            apiFetch(`/api/rooms/${roomId}/price-periods`, {
                                method: "POST",
                                body: values,
                            })
                        }
                        successMessage="Período criado."
                        submitLabel="Criar período"
                    />
                </section>
            )}
        </div>
    );
}
