"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "./button.jsx";

const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function findFocusableElements(container) {
    return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
}

function keepFocusInside(event, container) {
    const focusableElements = findFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1);

    if (!firstElement) {
        event.preventDefault();
        return;
    }

    if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
    }
}

export function ConfirmDialog({
    isOpen,
    title,
    description,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    variant = "danger",
    isConfirming = false,
    isConfirmDisabled = false,
    onConfirm,
    onCancel,
    children,
}) {
    const dialogRef = useRef(null);
    const titleId = useId();
    const descriptionId = useId();

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const previouslyFocused = document.activeElement;
        const [firstElement = dialogRef.current] = findFocusableElements(
            dialogRef.current,
        );
        firstElement.focus();

        return () => {
            previouslyFocused?.focus?.();
        };
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    function handleKeyDown(event) {
        if (event.key === "Escape") {
            event.stopPropagation();
            if (!isConfirming) {
                onCancel();
            }
            return;
        }

        if (event.key === "Tab") {
            keepFocusInside(event, dialogRef.current);
        }
    }

    return (
        <div className="p-gutter fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                tabIndex={-1}
                aria-labelledby={titleId}
                aria-describedby={description ? descriptionId : undefined}
                onKeyDown={handleKeyDown}
                className="rounded-card bg-surface flex w-full max-w-md flex-col gap-4 p-6 shadow-xl"
            >
                <h2
                    id={titleId}
                    className="text-foreground text-lg font-semibold"
                >
                    {title}
                </h2>
                {description && (
                    <p
                        id={descriptionId}
                        className="text-muted-foreground text-sm"
                    >
                        {description}
                    </p>
                )}
                {children}
                <div className="flex justify-end gap-2">
                    <Button
                        variant="secondary"
                        onClick={onCancel}
                        disabled={isConfirming}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={variant}
                        onClick={onConfirm}
                        isLoading={isConfirming}
                        disabled={isConfirmDisabled}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
