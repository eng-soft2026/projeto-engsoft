import { screen } from "@testing-library/react";
import { SearchX } from "lucide-react";
import { describe, expect, it } from "vitest";
import { Button } from "../../../src/components/ui/button.jsx";
import { EmptyState } from "../../../src/components/ui/empty-state.jsx";
import { renderWithUser } from "../../helpers/render.jsx";

describe("EmptyState", () => {
    it("renders the title, description and action", () => {
        renderWithUser(
            <EmptyState
                icon={SearchX}
                title="Nenhum hotel encontrado"
                description="Ajuste os filtros e tente novamente."
                action={<Button>Limpar filtros</Button>}
            />,
        );

        expect(
            screen.getByRole("heading", { name: "Nenhum hotel encontrado" }),
        ).toBeInTheDocument();
        expect(
            screen.getByText("Ajuste os filtros e tente novamente."),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Limpar filtros" }),
        ).toBeInTheDocument();
    });

    it("renders only the title with the default icon", () => {
        const { container } = renderWithUser(
            <EmptyState title="Sem reservas" className="mt-4" />,
        );

        expect(
            screen.getByRole("heading", { name: "Sem reservas" }),
        ).toBeVisible();
        expect(container.firstChild).toHaveClass("mt-4");
        expect(container.querySelectorAll("p")).toHaveLength(0);
        expect(container.querySelector("svg")).toBeInTheDocument();
    });
});
