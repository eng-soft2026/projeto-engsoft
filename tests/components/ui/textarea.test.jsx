import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Textarea } from "../../../src/components/ui/textarea.jsx";
import { renderWithUser } from "../../helpers/render.jsx";

describe("Textarea", () => {
    it("renders a multiline field with 4 rows by default", async () => {
        const { user } = renderWithUser(<Textarea aria-label="Motivo" />);

        const textarea = screen.getByRole("textbox", { name: "Motivo" });
        await user.type(textarea, "Documentação incompleta");

        expect(textarea).toHaveAttribute("rows", "4");
        expect(textarea).toHaveValue("Documentação incompleta");
        expect(textarea).not.toHaveAttribute("aria-invalid");
    });

    it("marks the field as invalid and disabled", () => {
        renderWithUser(
            <Textarea aria-label="Descrição" rows={6} isInvalid disabled />,
        );

        const textarea = screen.getByRole("textbox", { name: "Descrição" });

        expect(textarea).toHaveAttribute("rows", "6");
        expect(textarea).toHaveAttribute("aria-invalid", "true");
        expect(textarea).toBeDisabled();
    });
});
