import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card, CardTitle } from "../../../src/components/ui/card.jsx";
import { renderWithUser } from "../../helpers/render.jsx";

describe("Card", () => {
    it("renders a labelled section with a title", () => {
        renderWithUser(
            <Card aria-labelledby="card-title" className="max-w-sm">
                <h2 id="card-title">Unidade Centro</h2>
                <p>São Paulo</p>
            </Card>,
        );

        const card = screen.getByRole("region", { name: "Unidade Centro" });

        expect(card).toHaveClass("rounded-card", "max-w-sm");
        expect(card).toHaveTextContent("São Paulo");
    });

    it("renders as another element with a custom heading level", () => {
        renderWithUser(
            <Card as="article">
                <CardTitle as="h3" className="text-xl">
                    Quarto 101
                </CardTitle>
            </Card>,
        );

        expect(screen.getByRole("article")).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { level: 3, name: "Quarto 101" }),
        ).toHaveClass("text-xl");
    });

    it("uses an h2 title by default", () => {
        renderWithUser(<CardTitle>Resumo</CardTitle>);

        expect(
            screen.getByRole("heading", { level: 2, name: "Resumo" }),
        ).toBeInTheDocument();
    });
});
