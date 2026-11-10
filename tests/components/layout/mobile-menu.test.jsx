import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MobileMenu } from "../../../src/components/layout/mobile-menu.jsx";
import { GUEST_NAVIGATION_LINKS } from "../../../src/components/layout/navigation-links.js";
import { renderWithUser } from "../../helpers/render.jsx";

describe("MobileMenu", () => {
    it("starts closed", () => {
        renderWithUser(<MobileMenu links={GUEST_NAVIGATION_LINKS} />);

        expect(
            screen.getByRole("button", { name: "Abrir menu" }),
        ).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    });

    it("opens and closes with the toggle button", async () => {
        const { user } = renderWithUser(
            <MobileMenu links={GUEST_NAVIGATION_LINKS} />,
        );

        await user.click(screen.getByRole("button", { name: "Abrir menu" }));

        const toggle = screen.getByRole("button", { name: "Fechar menu" });
        const menu = screen.getByRole("navigation", { name: "Menu principal" });

        expect(toggle).toHaveAttribute("aria-expanded", "true");
        expect(toggle).toHaveAttribute("aria-controls", menu.id);
        expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute(
            "href",
            "/login",
        );

        await user.click(toggle);

        expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    });

    it("closes with Escape", async () => {
        const { user } = renderWithUser(
            <MobileMenu links={GUEST_NAVIGATION_LINKS} />,
        );

        await user.click(screen.getByRole("button", { name: "Abrir menu" }));
        await user.keyboard("{Escape}");

        expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    });

    it("stays open on other keys", async () => {
        const { user } = renderWithUser(
            <MobileMenu links={GUEST_NAVIGATION_LINKS} />,
        );

        await user.click(screen.getByRole("button", { name: "Abrir menu" }));
        await user.keyboard("a");

        expect(
            screen.getByRole("navigation", { name: "Menu principal" }),
        ).toBeInTheDocument();
    });

    it("closes when a link is chosen", async () => {
        const { user } = renderWithUser(
            <MobileMenu links={GUEST_NAVIGATION_LINKS} />,
        );

        await user.click(screen.getByRole("button", { name: "Abrir menu" }));
        await user.click(screen.getByRole("link", { name: "Cadastrar" }));

        expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    });
});
