"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button.jsx";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog.jsx";
import { apiFetch } from "../../../lib/api-client.js";
import { resolveErrorMessage } from "../../../lib/error-messages.js";

export function SubmitReviewButton({ hotelId }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function submitForReview() {
        setIsSubmitting(true);
        try {
            await apiFetch(`/api/hotels/${hotelId}/submit-review`, {
                method: "POST",
            });
        } catch (error) {
            toast.error(resolveErrorMessage(error));
            setIsSubmitting(false);
            return;
        }

        toast.success("Hotel enviado para análise.");
        setIsSubmitting(false);
        setIsOpen(false);
        router.refresh();
    }

    return (
        <>
            <Button onClick={() => setIsOpen(true)}>Enviar para análise</Button>
            <ConfirmDialog
                isOpen={isOpen}
                title="Enviar hotel para análise?"
                description="Durante a análise os dados do hotel não podem ser editados. O administrador vai publicar o hotel ou devolvê-lo com observações."
                confirmLabel="Enviar para análise"
                variant="primary"
                isConfirming={isSubmitting}
                onConfirm={submitForReview}
                onCancel={() => setIsOpen(false)}
            />
        </>
    );
}
