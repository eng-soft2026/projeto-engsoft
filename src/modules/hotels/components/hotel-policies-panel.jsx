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
import { Select } from "../../../components/ui/select.jsx";
import { Textarea } from "../../../components/ui/textarea.jsx";
import { HOTEL_POLICY_TYPES } from "../../../constants/hotel-policy-types.js";
import { useApiForm } from "../../../hooks/use-api-form.js";
import { apiFetch } from "../../../lib/api-client.js";
import { resolveErrorMessage } from "../../../lib/error-messages.js";
import { createPolicySchema } from "../../../schemas/policy-schemas.js";
import {
    HOTEL_POLICY_TYPE_OPTIONS,
    getHotelPolicyTypeLabel,
} from "../hotel-policy-labels.js";

const CANCELLATION_HINT =
    "O texto apenas complementa a informação: prazos e reembolsos seguem a política da plataforma.";

const EMPTY_POLICY = Object.freeze({
    type: HOTEL_POLICY_TYPES.OTHER,
    title: "",
    description: "",
});

function PolicyForm({
    defaultValues,
    submit,
    successMessage,
    submitLabel,
    onDone,
    onCancel,
}) {
    const router = useRouter();
    const { form, onSubmit, formError, isSubmitting } = useApiForm({
        schema: createPolicySchema,
        defaultValues,
        submit,
        successMessage,
        onSuccess: () => {
            form.reset(defaultValues);
            onDone?.();
            router.refresh();
        },
    });
    const { errors } = form.formState;
    const isCancellation =
        form.watch("type") === HOTEL_POLICY_TYPES.CANCELLATION;

    return (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <FormError message={formError} />
            <FormField
                label="Tipo"
                hint={isCancellation ? CANCELLATION_HINT : undefined}
                error={errors.type?.message}
                isRequired
            >
                <Select
                    options={HOTEL_POLICY_TYPE_OPTIONS}
                    {...form.register("type")}
                />
            </FormField>
            <FormField label="Título" error={errors.title?.message} isRequired>
                <Input {...form.register("title")} />
            </FormField>
            <FormField
                label="Descrição"
                error={errors.description?.message}
                isRequired
            >
                <Textarea {...form.register("description")} />
            </FormField>
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

function TogglePolicyButton({ policy }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const actionLabel = policy.isActive ? "Desativar" : "Reativar";

    async function togglePolicy() {
        setIsSaving(true);
        try {
            await apiFetch(`/api/policies/${policy.id}`, {
                method: "PATCH",
                body: { isActive: !policy.isActive },
            });
        } catch (error) {
            toast.error(resolveErrorMessage(error));
            setIsSaving(false);
            return;
        }

        toast.success(
            policy.isActive ? "Política desativada." : "Política reativada.",
        );
        setIsSaving(false);
        setIsOpen(false);
        router.refresh();
    }

    return (
        <>
            <Button
                variant="secondary"
                size="sm"
                aria-label={`${actionLabel} ${policy.title}`}
                onClick={() => setIsOpen(true)}
            >
                {actionLabel}
            </Button>
            <ConfirmDialog
                isOpen={isOpen}
                title={`${actionLabel} política?`}
                description={
                    policy.isActive
                        ? `${policy.title} deixará de ser exibida aos hóspedes.`
                        : `${policy.title} voltará a ser exibida aos hóspedes.`
                }
                confirmLabel={actionLabel}
                isConfirming={isSaving}
                onConfirm={togglePolicy}
                onCancel={() => setIsOpen(false)}
            />
        </>
    );
}

function PolicyItem({ policy, isEditable }) {
    const [isEditing, setIsEditing] = useState(false);
    const canEditText = isEditable && !policy.isSystem;

    if (isEditing) {
        return (
            <li className="py-3">
                <PolicyForm
                    defaultValues={{
                        type: policy.type,
                        title: policy.title,
                        description: policy.description,
                    }}
                    submit={(values) =>
                        apiFetch(`/api/policies/${policy.id}`, {
                            method: "PATCH",
                            body: values,
                        })
                    }
                    successMessage="Política atualizada."
                    submitLabel="Salvar política"
                    onDone={() => setIsEditing(false)}
                    onCancel={() => setIsEditing(false)}
                />
            </li>
        );
    }

    return (
        <li className="flex flex-col gap-2 py-3">
            <div className="flex flex-wrap items-center gap-2">
                <p className="text-foreground text-sm font-medium">
                    {policy.title}
                </p>
                <Badge tone="info">
                    {getHotelPolicyTypeLabel(policy.type)}
                </Badge>
                {policy.isSystem && <Badge>Padrão</Badge>}
                {!policy.isActive && <Badge tone="warning">Inativa</Badge>}
            </div>
            <p className="text-muted-foreground text-sm whitespace-pre-line">
                {policy.description}
            </p>
            {isEditable && (
                <div className="flex flex-wrap gap-2">
                    {canEditText && (
                        <Button
                            variant="secondary"
                            size="sm"
                            aria-label={`Editar ${policy.title}`}
                            onClick={() => setIsEditing(true)}
                        >
                            Editar
                        </Button>
                    )}
                    <TogglePolicyButton policy={policy} />
                </div>
            )}
        </li>
    );
}

export function HotelPoliciesPanel({ hotelId, isEditable, policies }) {
    return (
        <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3">
                <CardTitle>Políticas do hotel</CardTitle>
                {policies.length === 0 ? (
                    <EmptyState
                        title="Nenhuma política cadastrada"
                        description="Adicione políticas para informar os hóspedes."
                    />
                ) : (
                    <ul className="divide-border flex flex-col divide-y">
                        {policies.map((policy) => (
                            <PolicyItem
                                key={policy.id}
                                policy={policy}
                                isEditable={isEditable}
                            />
                        ))}
                    </ul>
                )}
            </section>
            {isEditable && (
                <section className="flex flex-col gap-3">
                    <CardTitle as="h3">Nova política</CardTitle>
                    <PolicyForm
                        defaultValues={EMPTY_POLICY}
                        submit={(values) =>
                            apiFetch(`/api/hotels/${hotelId}/policies`, {
                                method: "POST",
                                body: values,
                            })
                        }
                        successMessage="Política criada."
                        submitLabel="Criar política"
                    />
                </section>
            )}
        </div>
    );
}
