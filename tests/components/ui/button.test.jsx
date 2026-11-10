import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../../../src/components/ui/button.jsx";
import { renderWithUser } from "../../helpers/render.jsx";

describe("Button", () => {
    it("renders a type=button primary button and handles clicks", async () => {
        const onClick = vi.fn();
        const { user } = renderWithUser(
            <Button onClick={onClick}>Salvar</Button>,
        );

        const button = screen.getByRole("button", { name: "Salvar" });
        await user.click(button);

        expect(button).toHaveAttribute("type", "button");
        expect(button).toHaveClass("bg-primary");
        expect(onClick).toHaveBeenCalledOnce();
    });

    it("applies the variant, size, type and extra class name", () => {
        renderWithUser(
            <Button variant="danger" size="lg" type="submit" className="w-full">
                Excluir
            </Button>,
        );

        const button = screen.getByRole("button", { name: "Excluir" });

        expect(button).toHaveAttribute("type", "submit");
        expect(button).toHaveClass("bg-danger", "h-12", "w-full");
    });

    it("does not fire clicks when disabled", async () => {
        const onClick = vi.fn();
        const { user } = renderWithUser(
            <Button disabled onClick={onClick}>
                Salvar
            </Button>,
        );

        const button = screen.getByRole("button", { name: "Salvar" });
        await user.click(button);

        expect(button).toBeDisabled();
        expect(onClick).not.toHaveBeenCalled();
    });

    it("shows a spinner and blocks clicks while loading", async () => {
        const onClick = vi.fn();
        const { user } = renderWithUser(
            <Button isLoading onClick={onClick}>
                Salvar
            </Button>,
        );

        const button = screen.getByRole("button", { name: /Salvar/ });
        await user.click(button);

        expect(button).toBeDisabled();
        expect(button).toHaveAttribute("aria-busy", "true");
        expect(screen.getByRole("status")).toHaveTextContent("Processando");
        expect(onClick).not.toHaveBeenCalled();
    });
});
