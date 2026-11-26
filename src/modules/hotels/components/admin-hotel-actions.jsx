"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button.jsx";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog.jsx";
import { FormError } from "../../../components/ui/form-error.jsx";
import { FormField } from "../../../components/ui/form-field.jsx";
import { Select } from "../../../components/ui/select.jsx";
import { Textarea } from "../../../components/ui/textarea.jsx";
import { apiFetch } from "../../../lib/api-client.js";
import { resolveErrorMessage } from "../../../lib/error-messages.js";
import {
    ADMIN_ACTION_REASON_MAX_LENGTH,
    UNBLOCK_TARGET_OPTIONS,
    buildAdminActionRequest,
    getAvailableAdminActions,
    validateAdminActionInput,
} from "../admin-hotel-actions.js";

function AdminActionDialog({ hotelId, adminAction, onClose }) {
    const router = useRouter();
    const [reason, setReason] = useState("");
    const [targetStatus, setTargetStatus] = useState("");
    const [errorMessage, setErrorMessage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const validationError = validateAdminActionInput(adminAction, {
        reason,
        targetStatus,
    });

    async function confirmAction() {
        if (validationError) {
            setErrorMessage(validationError);
            return;
        }

        const { path, options } = buildAdminActionRequest(
            hotelId,
            adminAction,
            { reason, targetStatus },
        );
        setIsSubmitting(true);
        setErrorMessage(null);
        try {
            await apiFetch(path, options);
        } catch (error) {
            setErrorMessage(resolveErrorMessage(error));
            setIsSubmitting(false);
            return;
        }

        toast.success(adminAction.successMessage);
        setIsSubmitting(false);
        onClose();
        router.refresh();
    }

    return (
        <ConfirmDialog
            isOpen
            title={adminAction.title}
            description={adminAction.description}
            confirmLabel={adminAction.confirmLabel}
            variant={adminAction.variant === "danger" ? "danger" : "primary"}
            isConfirming={isSubmitting}
            isConfirmDisabled={Boolean(validationError)}
            onConfirm={confirmAction}
            onCancel={onClose}
        >
            <FormError message={errorMessage} />
            <FormField
                label="Motivo"
                hint={`Obrigatório, até ${ADMIN_ACTION_REASON_MAX_LENGTH} caracteres. Fica registrado na auditoria.`}
                isRequired
            >
                <Textarea
                    value={reason}
                    maxLength={ADMIN_ACTION_REASON_MAX_LENGTH}
                    onChange={(event) => setReason(event.target.value)}
                />
            </FormField>
            {adminAction.requiresTargetStatus && (
                <FormField label="Status de destino" isRequired>
                    <Select
                        value={targetStatus}
                        placeholder="Selecione o destino"
                        options={UNBLOCK_TARGET_OPTIONS}
                        onChange={(event) =>
                            setTargetStatus(event.target.value)
                        }
                    />
                </FormField>
            )}
        </ConfirmDialog>
    );
}

export function AdminHotelActions({ hotelId, status, allowedActions }) {
    const [openAction, setOpenAction] = useState(null);
    const adminActions = getAvailableAdminActions(status).filter(
        ({ action }) => !allowedActions || allowedActions.includes(action),
    );

    if (adminActions.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap gap-2">
            {adminActions.map((adminAction) => (
                <Button
                    key={adminAction.action}
                    variant={adminAction.variant}
                    onClick={() => setOpenAction(adminAction)}
                >
                    {adminAction.label}
                </Button>
            ))}
            {openAction && (
                <AdminActionDialog
                    key={openAction.action}
                    hotelId={hotelId}
                    adminAction={openAction}
                    onClose={() => setOpenAction(null)}
                />
            )}
        </div>
    );
}
