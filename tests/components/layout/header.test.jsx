import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Header } from "../../../src/components/layout/header.jsx";
import { renderWithUser } from "../../helpers/render.jsx";

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const SIGNED_IN_USER = Object.freeze({
    id: "user-1",
    name: "Ana Maria Souza",
    role: "CUSTOMER",
});

describe("Header", () => {
    it("renders the brand link and the guest links", () => {
        renderWithUser(<Header />);

        expect(
            screen.getByRole("link", { name: "Reserva de Hotéis" }),
        ).toHaveAttribute("href", "/");

        const navigation = screen.getByRole("navigation", {
            name: "Navegação principal",
        });

        expect(
            within(navigation).getByRole("link", { name: "Entrar" }),
        ).toHaveAttribute("href", "/login");
        expect(
            within(navigation).getByRole("link", { name: "Cadastrar" }),
        ).toHaveAttribute("href", "/register");
    });

    it("renders custom links", () => {
        renderWithUser(
            <Header links={[{ href: "/favorites", label: "Favoritos" }]} />,
        );

        expect(screen.getByRole("link", { name: "Favoritos" })).toHaveAttribute(
            "href",
            "/favorites",
        );
    });

    it("has no logout button for a visitor", () => {
        renderWithUser(<Header />);

        expect(
            screen.queryByRole("button", { name: "Sair" }),
        ).not.toBeInTheDocument();
    });

    it("greets a signed-in user and offers the logout instead of the guest links", () => {
        renderWithUser(<Header user={SIGNED_IN_USER} />);

        const navigation = screen.getByRole("navigation", {
            name: "Navegação principal",
        });

        expect(within(navigation).getByText("Olá, Ana")).toBeInTheDocument();
        expect(
            within(navigation).getByRole("button", { name: "Sair" }),
        ).toBeInTheDocument();
        expect(
            within(navigation).queryByRole("link", { name: "Entrar" }),
        ).not.toBeInTheDocument();
        expect(
            within(navigation).queryByRole("link", { name: "Cadastrar" }),
        ).not.toBeInTheDocument();
    });
});
