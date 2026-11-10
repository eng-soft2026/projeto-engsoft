import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MobileMenu } from "../../../src/components/layout/mobile-menu.jsx";
import { GUEST_NAVIGATION_LINKS } from "../../../src/components/layout/navigation-links.js";
import { apiFetch } from "../../../src/lib/api-client.js";
import { renderWithUser } from "../../helpers/render.jsx";

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("../../../src/lib/api-client.js", async (importOriginal) => ({
    ...(await importOriginal()),
    apiFetch: vi.fn(),
}));

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

    it("has no logout button for a visitor", async () => {
        const { user } = renderWithUser(
            <MobileMenu links={GUEST_NAVIGATION_LINKS} />,
        );

        await user.click(screen.getByRole("button", { name: "Abrir menu" }));

        expect(
            screen.queryByRole("button", { name: "Sair" }),
        ).not.toBeInTheDocument();
    });

    it("logs out a signed-in user and closes", async () => {
        apiFetch.mockResolvedValue(null);
        const { user } = renderWithUser(<MobileMenu links={[]} isSignedIn />);

        await user.click(screen.getByRole("button", { name: "Abrir menu" }));
        await user.click(screen.getByRole("button", { name: "Sair" }));

        await waitFor(() =>
            expect(screen.queryByRole("navigation")).not.toBeInTheDocument(),
        );
        expect(apiFetch).toHaveBeenCalledWith("/api/auth/logout", {
            method: "POST",
        });
    });
});
