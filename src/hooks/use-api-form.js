import { useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ApiError } from "../lib/api-client.js";
import { resolveErrorMessage } from "../lib/error-messages.js";

function findErrorField(error, fieldErrorCodes) {
    if (!(error instanceof ApiError)) {
        return undefined;
    }
    if (!Object.hasOwn(fieldErrorCodes, error.code)) {
        return undefined;
    }
    return fieldErrorCodes[error.code];
}

export function useApiForm({
    schema,
    defaultValues,
    submit,
    onSuccess,
    successMessage,
    fieldErrorCodes = {},
}) {
    const form = useForm({ resolver: zodResolver(schema), defaultValues });
    const [formError, setFormError] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const isSubmittingRef = useRef(false);

    function showSubmitError(error) {
        const message = resolveErrorMessage(error);
        const fieldName = findErrorField(error, fieldErrorCodes);
        if (fieldName) {
            form.setError(
                fieldName,
                { type: "server", message },
                { shouldFocus: true },
            );
            return;
        }

        setFormError(message);
        toast.error(message);
    }

    async function sendValues(values) {
        let data;
        try {
            data = await submit(values);
        } catch (error) {
            showSubmitError(error);
            return;
        }

        if (successMessage) {
            toast.success(successMessage);
        }
        await onSuccess?.(data, values);
    }

    async function submitValues(values) {
        if (isSubmittingRef.current) {
            return;
        }

        isSubmittingRef.current = true;
        setIsSending(true);
        setFormError(null);
        try {
            await sendValues(values);
        } finally {
            isSubmittingRef.current = false;
            setIsSending(false);
        }
    }

    return {
        form,
        onSubmit: form.handleSubmit(submitValues),
        formError,
        isSubmitting: isSending || form.formState.isSubmitting,
    };
}
