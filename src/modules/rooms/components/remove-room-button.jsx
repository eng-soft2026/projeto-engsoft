"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button.jsx";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog.jsx";
import { apiFetch } from "../../../lib/api-client.js";
import { resolveErrorMessage } from "../../../lib/error-messages.js";
import { buildRoomsHref } from "../room-routes.js";

const DELETED_OUTCOME = "DELETED";

export const ROOM_DELETED_MESSAGE = "Quarto excluído.";

export const ROOM_DEACTIVATED_ON_REMOVE_MESSAGE =
    "O quarto tem histórico e foi desativado em vez de excluído; ele não pode ser reativado.";

export function RemoveRoomButton({ hotelId, room }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    async function removeRoom() {
        setIsSaving(true);
        let result;
        try {
            result = await apiFetch(`/api/rooms/${room.id}`, {
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
            toast.success(ROOM_DELETED_MESSAGE);
            router.push(buildRoomsHref(hotelId, { unitId: room.unitId }));
            router.refresh();
            return;
        }

        toast.success(ROOM_DEACTIVATED_ON_REMOVE_MESSAGE);
        router.refresh();
    }

    return (
        <>
            <Button
                variant="danger"
                className="self-start"
                onClick={() => setIsOpen(true)}
            >
                Remover quarto
            </Button>
            <ConfirmDialog
                isOpen={isOpen}
                title="Remover quarto?"
                description={`O quarto ${room.number} será excluído se não tiver histórico; caso contrário, será desativado e não poderá ser reativado.`}
                confirmLabel="Remover"
                isConfirming={isSaving}
                onConfirm={removeRoom}
                onCancel={() => setIsOpen(false)}
            />
        </>
    );
}
