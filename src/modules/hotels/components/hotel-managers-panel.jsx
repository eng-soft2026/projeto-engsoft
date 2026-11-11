"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "../../../components/ui/badge.jsx";
import { Button } from "../../../components/ui/button.jsx";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog.jsx";
import { EmptyState } from "../../../components/ui/empty-state.jsx";
import { FormError } from "../../../components/ui/form-error.jsx";
import { FormField } from "../../../components/ui/form-field.jsx";
import { Input } from "../../../components/ui/input.jsx";
import { useApiForm } from "../../../hooks/use-api-form.js";
import { apiFetch } from "../../../lib/api-client.js";
import { resolveErrorMessage } from "../../../lib/error-messages.js";
import { ERROR_CODES } from "../../../lib/errors.js";
import { addHotelManagerSchema } from "../../../schemas/hotel-schemas.js";

const ADD_MANAGER_FIELD_ERROR_CODES = {
    [ERROR_CODES.USER_NOT_FOUND]: "email",
    [ERROR_CODES.HOTEL_MANAGER_ALREADY_EXISTS]: "email",
    [ERROR_CODES.VALIDATION_ERROR]: "email",
};

function AddHotelManagerForm({ hotelId }) {
    const router = useRouter();
    const { form, onSubmit, formError, isSubmitting } = useApiForm({
        schema: addHotelManagerSchema,
        defaultValues: { email: "" },
        submit: (values) =>
            apiFetch(`/api/hotels/${hotelId}/managers`, {
                method: "POST",
                body: values,
            }),
        successMessage: "Gestor adicionado.",
        fieldErrorCodes: ADD_MANAGER_FIELD_ERROR_CODES,
        onSuccess: () => {
            form.reset();
            router.refresh();
        },
    });

    return (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <FormError message={formError} />
            <FormField
                label="E-mail do gestor"
                hint="O usuário precisa ter conta de gestor."
                error={form.formState.errors.email?.message}
                isRequired
            >
                <Input
                    type="email"
                    autoComplete="off"
                    {...form.register("email")}
                />
            </FormField>
            <Button type="submit" isLoading={isSubmitting}>
                Adicionar gestor
            </Button>
        </form>
    );
}

function RemoveHotelManagerButton({ hotelId, manager }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    async function removeManager() {
        setIsRemoving(true);
        try {
            await apiFetch(`/api/hotels/${hotelId}/managers/${manager.id}`, {
                method: "DELETE",
            });
        } catch (error) {
            toast.error(resolveErrorMessage(error));
            setIsRemoving(false);
            return;
        }

        toast.success("Gestor removido.");
        setIsRemoving(false);
        setIsOpen(false);
        router.refresh();
    }

    return (
        <>
            <Button
                variant="secondary"
                size="sm"
                aria-label={`Remover ${manager.name}`}
                onClick={() => setIsOpen(true)}
            >
                Remover
            </Button>
            <ConfirmDialog
                isOpen={isOpen}
                title="Remover gestor?"
                description={`${manager.name} deixará de gerenciar este hotel.`}
                confirmLabel="Remover"
                isConfirming={isRemoving}
                onConfirm={removeManager}
                onCancel={() => setIsOpen(false)}
            />
        </>
    );
}

function ManagerIdentity({ manager }) {
    return (
        <div className="min-w-0">
            <p className="text-foreground truncate text-sm font-medium">
                {manager.name}
            </p>
            <p className="text-muted-foreground truncate text-sm">
                {manager.email}
            </p>
        </div>
    );
}

export function HotelManagersPanel({ hotelId, owner, managers }) {
    return (
        <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3">
                <h2 className="text-foreground text-lg font-semibold">
                    Gestores do hotel
                </h2>
                <ul className="divide-border flex flex-col divide-y">
                    <li className="flex items-center justify-between gap-3 py-3">
                        <ManagerIdentity manager={owner} />
                        <Badge>Proprietário</Badge>
                    </li>
                    {managers.map((manager) => (
                        <li
                            key={manager.id}
                            className="flex items-center justify-between gap-3 py-3"
                        >
                            <ManagerIdentity manager={manager} />
                            <RemoveHotelManagerButton
                                hotelId={hotelId}
                                manager={manager}
                            />
                        </li>
                    ))}
                </ul>
                {managers.length === 0 && (
                    <EmptyState
                        title="Nenhum gestor adicional"
                        description="Adicione gestores para dividir a operação do hotel."
                    />
                )}
            </section>
            <section className="flex flex-col gap-3">
                <h2 className="text-foreground text-lg font-semibold">
                    Adicionar gestor
                </h2>
                <AddHotelManagerForm hotelId={hotelId} />
            </section>
        </div>
    );
}
