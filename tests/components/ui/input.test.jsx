import { createRef } from "react";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "../../../src/components/ui/input.jsx";
import { renderWithUser } from "../../helpers/render.jsx";

describe("Input", () => {
    it("renders a text input that accepts typing", async () => {
        const { user } = renderWithUser(<Input aria-label="Nome" />);

        const input = screen.getByRole("textbox", { name: "Nome" });
        await user.type(input, "Maria");

        expect(input).toHaveAttribute("type", "text");
        expect(input).toHaveValue("Maria");
        expect(input).not.toHaveAttribute("aria-invalid");
        expect(input).toHaveClass("border-border");
    });

    it("marks the input as invalid", () => {
        renderWithUser(<Input aria-label="E-mail" type="email" isInvalid />);

        const input = screen.getByRole("textbox", { name: "E-mail" });

        expect(input).toHaveAttribute("aria-invalid", "true");
        expect(input).toHaveClass("border-danger");
    });

    it("forwards the ref and the disabled state", () => {
        const ref = createRef();
        renderWithUser(<Input aria-label="Cidade" ref={ref} disabled />);

        const input = screen.getByRole("textbox", { name: "Cidade" });

        expect(input).toBeDisabled();
        expect(ref.current).toBe(input);
    });
});
