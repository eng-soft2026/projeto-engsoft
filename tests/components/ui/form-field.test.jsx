import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormField } from "../../../src/components/ui/form-field.jsx";
import { Input } from "../../../src/components/ui/input.jsx";
import { Select } from "../../../src/components/ui/select.jsx";
import { renderWithUser } from "../../helpers/render.jsx";

describe("FormField", () => {
    it("links the label to the control without error", () => {
        renderWithUser(
            <FormField label="Nome">
                <Input />
            </FormField>,
        );

        const input = screen.getByRole("textbox", { name: "Nome" });

        expect(input).not.toHaveAttribute("aria-invalid");
        expect(input).not.toHaveAttribute("aria-describedby");
        expect(input).not.toBeRequired();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("shows the error, marks the control invalid and describes it", () => {
        renderWithUser(
            <FormField
                label="E-mail"
                hint="Usaremos para enviar a confirmação."
                error="Informe um e-mail válido."
                isRequired
            >
                <Input id="email" type="email" aria-describedby="extra" />
            </FormField>,
        );

        const input = screen.getByRole("textbox", { name: /E-mail/ });

        expect(input).toHaveAttribute("id", "email");
        expect(input).toHaveAttribute("aria-invalid", "true");
        expect(input).toBeRequired();
        expect(input).toHaveAttribute(
            "aria-describedby",
            "extra email-hint email-error",
        );
        expect(screen.getByRole("alert")).toHaveTextContent(
            "Informe um e-mail válido.",
        );
        expect(input).toHaveAccessibleDescription(
            "Usaremos para enviar a confirmação. Informe um e-mail válido.",
        );
    });

    it("keeps the required flag of the control", () => {
        renderWithUser(
            <FormField label="Status">
                <Select
                    options={[{ value: "DRAFT", label: "Rascunho" }]}
                    required
                />
            </FormField>,
        );

        expect(screen.getByRole("combobox", { name: "Status" })).toBeRequired();
    });
});
