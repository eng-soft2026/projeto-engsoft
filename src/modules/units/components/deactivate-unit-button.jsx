"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button.jsx";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog.jsx";
import { apiFetch } from "../../../lib/api-client.js";
import { resolveErrorMessage } from "../../../lib/error-messages.js";

export function DeactivateUnitButton({ unit }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    async function deactivateUnit() {
        setIsSaving(true);
        try {
            await apiFetch(`/api/units/${unit.id}`, {
                method: "PATCH",
                body: { isActive: false },
            });
        } catch (error) {
            toast.error(resolveErrorMessage(error));
            setIsSaving(false);
            return;
        }

        toast.success("Unidade desativada.");
        setIsSaving(false);
        setIsOpen(false);
        router.refresh();
    }

    return (
        <>
            <Button
                variant="danger"
                className="self-start"
                onClick={() => setIsOpen(true)}
            >
                Desativar unidade
            </Button>
            <ConfirmDialog
                isOpen={isOpen}
                title="Desativar unidade?"
                description={`${unit.name} deixará de receber reservas. Uma unidade desativada não pode ser reativada.`}
                confirmLabel="Desativar"
                isConfirming={isSaving}
                onConfirm={deactivateUnit}
                onCancel={() => setIsOpen(false)}
            />
        </>
    );
}
