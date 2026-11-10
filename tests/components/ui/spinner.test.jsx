import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Spinner } from "../../../src/components/ui/spinner.jsx";
import { renderWithUser } from "../../helpers/render.jsx";

describe("Spinner", () => {
    it("announces the default loading label", () => {
        renderWithUser(<Spinner />);

        expect(screen.getByRole("status")).toHaveTextContent("Carregando");
    });

    it("uses a custom label and class name", () => {
        const { container } = renderWithUser(
            <Spinner label="Buscando hotéis" className="size-8" />,
        );

        expect(screen.getByRole("status")).toHaveTextContent("Buscando hotéis");
        expect(container.querySelector("svg")).toHaveClass("size-8");
    });
});
