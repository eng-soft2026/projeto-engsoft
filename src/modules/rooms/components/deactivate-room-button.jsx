"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button.jsx";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog.jsx";
import { apiFetch } from "../../../lib/api-client.js";
import { resolveErrorMessage } from "../../../lib/error-messages.js";

export function DeactivateRoomButton({ room }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    async function deactivateRoom() {
        setIsSaving(true);
        try {
            await apiFetch(`/api/rooms/${room.id}`, {
                method: "PATCH",
                body: { isActive: false },
            });
        } catch (error) {
            toast.error(resolveErrorMessage(error));
            setIsSaving(false);
            return;
        }

        setIsSaving(false);
        setIsOpen(false);
        toast.success("Quarto desativado.");
        router.refresh();
    }

    return (
        <>
            <Button
                variant="secondary"
                className="self-start"
                onClick={() => setIsOpen(true)}
            >
                Desativar quarto
            </Button>
            <ConfirmDialog
                isOpen={isOpen}
                title="Desativar quarto?"
                description={`O quarto ${room.number} deixará de receber reservas, mantendo o histórico, e não poderá ser reativado.`}
                confirmLabel="Desativar"
                isConfirming={isSaving}
                onConfirm={deactivateRoom}
                onCancel={() => setIsOpen(false)}
            />
        </>
    );
}
