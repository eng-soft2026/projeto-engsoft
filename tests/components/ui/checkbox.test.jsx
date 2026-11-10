import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Checkbox } from "../../../src/components/ui/checkbox.jsx";
import { renderWithUser } from "../../helpers/render.jsx";

describe("Checkbox", () => {
    it("is labelled and toggles when its label is clicked", async () => {
        const { user } = renderWithUser(<Checkbox label="Aceita pets" />);

        const checkbox = screen.getByRole("checkbox", { name: "Aceita pets" });
        await user.click(screen.getByText("Aceita pets"));

        expect(checkbox).toBeChecked();
        expect(checkbox).not.toHaveAttribute("aria-invalid");
    });

    it("uses the given id and the invalid and disabled states", () => {
        renderWithUser(
            <Checkbox id="terms" label="Aceito os termos" isInvalid disabled />,
        );

        const checkbox = screen.getByRole("checkbox", {
            name: "Aceito os termos",
        });

        expect(checkbox).toHaveAttribute("id", "terms");
        expect(checkbox).toHaveAttribute("aria-invalid", "true");
        expect(checkbox).toBeDisabled();
    });
});
