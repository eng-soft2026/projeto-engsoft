import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Header } from "../../../src/components/layout/header.jsx";
import { renderWithUser } from "../../helpers/render.jsx";

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
});
