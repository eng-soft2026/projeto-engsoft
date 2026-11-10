import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ErrorPage from "../../../src/app/error.jsx";
import NotFound, { metadata } from "../../../src/app/not-found.jsx";
import { renderWithUser } from "../../helpers/render.jsx";

function buildError() {
    const error = new Error("Falha interna em SELECT * FROM user");
    error.stack = "Error: Falha interna\n    at secret-module.js:10:5";
    error.digest = "digest-123";
    return error;
}

describe("ErrorPage", () => {
    it("shows a generic message without the error message or the stack", () => {
        const { container } = renderWithUser(
            <ErrorPage error={buildError()} reset={vi.fn()} />,
        );

        expect(
            screen.getByRole("heading", { name: "Algo deu errado" }),
        ).toBeInTheDocument();
        expect(container).not.toHaveTextContent("SELECT");
        expect(container).not.toHaveTextContent("secret-module.js");
        expect(container).not.toHaveTextContent("Falha interna");
    });

    it("shows the error digest as a reference code", () => {
        renderWithUser(<ErrorPage error={buildError()} reset={vi.fn()} />);

        expect(
            screen.getByText("Código do erro: digest-123"),
        ).toBeInTheDocument();
    });

    it("omits the reference code when the error has no digest", () => {
        renderWithUser(
            <ErrorPage error={new Error("sem digest")} reset={vi.fn()} />,
        );

        expect(screen.queryByText(/Código do erro/)).not.toBeInTheDocument();
    });

    it("retries through reset", async () => {
        const reset = vi.fn();
        const { user } = renderWithUser(
            <ErrorPage error={buildError()} reset={reset} />,
        );

        await user.click(
            screen.getByRole("button", { name: "Tentar novamente" }),
        );

        expect(reset).toHaveBeenCalledTimes(1);
    });
});

describe("NotFound", () => {
    it("explains the missing page and links back home", () => {
        renderWithUser(<NotFound />);

        expect(
            screen.getByRole("heading", { name: "Página não encontrada" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "Voltar para o início" }),
        ).toHaveAttribute("href", "/");
        expect(metadata.title).toBe(
            "Página não encontrada | Reserva de Hotéis",
        );
    });
});
