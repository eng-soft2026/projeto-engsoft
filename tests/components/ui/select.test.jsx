import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Select } from "../../../src/components/ui/select.jsx";
import { renderWithUser } from "../../helpers/render.jsx";

const STATUS_OPTIONS = [
    { value: "DRAFT", label: "Rascunho" },
    { value: "PUBLISHED", label: "Publicado" },
    { value: "BLOCKED", label: "Bloqueado", isDisabled: true },
];

describe("Select", () => {
    it("renders the placeholder and the options and changes the value", async () => {
        const { user } = renderWithUser(
            <Select
                aria-label="Status"
                placeholder="Selecione"
                options={STATUS_OPTIONS}
                defaultValue=""
            />,
        );

        const select = screen.getByRole("combobox", { name: "Status" });
        await user.selectOptions(select, "PUBLISHED");

        expect(screen.getAllByRole("option")).toHaveLength(4);
        expect(
            screen.getByRole("option", { name: "Bloqueado" }),
        ).toBeDisabled();
        expect(select).toHaveValue("PUBLISHED");
        expect(select).not.toHaveAttribute("aria-invalid");
    });

    it("renders without placeholder or options", () => {
        renderWithUser(<Select aria-label="Vazio" />);

        expect(screen.queryAllByRole("option")).toHaveLength(0);
    });

    it("marks the select as invalid and disabled", () => {
        renderWithUser(
            <Select
                aria-label="Status"
                options={STATUS_OPTIONS}
                isInvalid
                disabled
            />,
        );

        const select = screen.getByRole("combobox", { name: "Status" });

        expect(select).toHaveAttribute("aria-invalid", "true");
        expect(select).toBeDisabled();
    });
});
