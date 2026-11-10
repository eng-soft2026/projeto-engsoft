import { useState } from "react";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "../../../src/components/ui/confirm-dialog.jsx";
import { Textarea } from "../../../src/components/ui/textarea.jsx";
import { renderWithUser } from "../../helpers/render.jsx";

function DialogTrigger({ onConfirm = vi.fn(), children }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button type="button" onClick={() => setIsOpen(true)}>
                Bloquear hotel
            </button>
            <ConfirmDialog
                isOpen={isOpen}
                title="Bloquear hotel?"
                description="O hotel deixa de aparecer nas buscas."
                confirmLabel="Bloquear"
                onConfirm={onConfirm}
                onCancel={() => setIsOpen(false)}
            >
                {children}
            </ConfirmDialog>
        </>
    );
}

function renderDialog(props) {
    return renderWithUser(
        <ConfirmDialog
            isOpen
            title="Excluir quarto?"
            onConfirm={vi.fn()}
            onCancel={vi.fn()}
            {...props}
        />,
    );
}

describe("ConfirmDialog", () => {
    it("renders nothing while closed", () => {
        renderDialog({ isOpen: false });

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("opens a labelled modal dialog and focuses its first control", async () => {
        const { user } = renderWithUser(<DialogTrigger />);

        await user.click(
            screen.getByRole("button", { name: "Bloquear hotel" }),
        );

        const dialog = screen.getByRole("dialog", { name: "Bloquear hotel?" });

        expect(dialog).toHaveAttribute("aria-modal", "true");
        expect(dialog).toHaveAccessibleDescription(
            "O hotel deixa de aparecer nas buscas.",
        );
        expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
    });

    it("closes with Escape and returns the focus to the trigger", async () => {
        const { user } = renderWithUser(<DialogTrigger />);
        const trigger = screen.getByRole("button", { name: "Bloquear hotel" });

        await user.click(trigger);
        await user.keyboard("{Escape}");

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
    });

    it("closes with the cancel button", async () => {
        const { user } = renderWithUser(<DialogTrigger />);

        await user.click(
            screen.getByRole("button", { name: "Bloquear hotel" }),
        );
        await user.click(screen.getByRole("button", { name: "Cancelar" }));

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("keeps the focus inside the dialog with Tab and Shift+Tab", async () => {
        const { user } = renderWithUser(
            <DialogTrigger>
                <Textarea aria-label="Motivo" />
            </DialogTrigger>,
        );

        await user.click(
            screen.getByRole("button", { name: "Bloquear hotel" }),
        );
        const reason = screen.getByRole("textbox", { name: "Motivo" });
        const confirmButton = screen.getByRole("button", { name: "Bloquear" });

        expect(reason).toHaveFocus();

        await user.tab({ shift: true });
        expect(confirmButton).toHaveFocus();

        await user.tab();
        expect(reason).toHaveFocus();

        await user.tab();
        expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();

        await user.tab({ shift: true });
        expect(reason).toHaveFocus();
    });

    it("calls onConfirm when confirmed", async () => {
        const onConfirm = vi.fn();
        const { user } = renderWithUser(
            <DialogTrigger onConfirm={onConfirm} />,
        );

        await user.click(
            screen.getByRole("button", { name: "Bloquear hotel" }),
        );
        await user.click(screen.getByRole("button", { name: "Bloquear" }));

        expect(onConfirm).toHaveBeenCalledOnce();
    });

    it("blocks the confirmation while it is disabled", async () => {
        const onConfirm = vi.fn();
        const { user } = renderDialog({ onConfirm, isConfirmDisabled: true });

        const confirmButton = screen.getByRole("button", { name: "Confirmar" });
        await user.click(confirmButton);

        expect(confirmButton).toBeDisabled();
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it("ignores Escape and disables both buttons while confirming", async () => {
        const onCancel = vi.fn();
        const { user } = renderDialog({ onCancel, isConfirming: true });

        expect(screen.getByRole("dialog")).toHaveFocus();

        await user.tab();
        expect(screen.getByRole("dialog")).toHaveFocus();

        await user.keyboard("{Escape}");

        expect(onCancel).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
        expect(
            screen.getByRole("button", { name: /Confirmar/ }),
        ).toHaveAttribute("aria-busy", "true");
    });

    it("ignores other keys and has no description when none is given", async () => {
        const onCancel = vi.fn();
        const { user } = renderDialog({
            onCancel,
            confirmLabel: "Excluir",
            cancelLabel: "Voltar",
            variant: "primary",
        });

        await user.keyboard("a");

        expect(onCancel).not.toHaveBeenCalled();
        expect(screen.getByRole("dialog")).not.toHaveAttribute(
            "aria-describedby",
        );
        expect(screen.getByRole("button", { name: "Excluir" })).toHaveClass(
            "bg-primary",
        );
        expect(screen.getByRole("button", { name: "Voltar" })).toHaveFocus();
    });
});
