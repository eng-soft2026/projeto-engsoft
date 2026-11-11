"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button.jsx";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog.jsx";
import { apiFetch } from "../../../lib/api-client.js";
import { resolveErrorMessage } from "../../../lib/error-messages.js";
import { buildRoomTypesHref } from "../room-type-routes.js";

const DELETED_OUTCOME = "DELETED";

export function RemoveRoomTypeButton({ hotelId, roomType }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    async function removeRoomType() {
        setIsSaving(true);
        let result;
        try {
            result = await apiFetch(`/api/room-types/${roomType.id}`, {
                method: "DELETE",
            });
        } catch (error) {
            toast.error(resolveErrorMessage(error));
            setIsSaving(false);
            return;
        }

        setIsSaving(false);
        setIsOpen(false);
        if (result?.outcome === DELETED_OUTCOME) {
            toast.success("Tipo de acomodação excluído.");
            router.push(buildRoomTypesHref(hotelId));
            router.refresh();
            return;
        }

        toast.success("Tipo de acomodação desativado.");
        router.refresh();
    }

    return (
        <>
            <Button
                variant="danger"
                className="self-start"
                onClick={() => setIsOpen(true)}
            >
                Remover tipo
            </Button>
            <ConfirmDialog
                isOpen={isOpen}
                title="Remover tipo de acomodação?"
                description={`${roomType.name} será excluído se nenhum quarto o usou; caso contrário, será desativado e não poderá ser reativado.`}
                confirmLabel="Remover"
                isConfirming={isSaving}
                onConfirm={removeRoomType}
                onCancel={() => setIsOpen(false)}
            />
        </>
    );
}
