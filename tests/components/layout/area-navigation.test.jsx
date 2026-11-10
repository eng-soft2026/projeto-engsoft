import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AreaLayout } from "../../../src/components/layout/area-layout.jsx";
import { AreaNavigation } from "../../../src/components/layout/area-navigation.jsx";
import { MANAGER_AREA_NAVIGATION } from "../../../src/components/layout/navigation-links.js";
import { renderWithUser } from "../../helpers/render.jsx";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));

vi.mock("next/navigation", () => ({ usePathname }));

describe("AreaNavigation", () => {
    beforeEach(() => {
        usePathname.mockReturnValue("/manager");
    });

    it("renders every area item as a link", () => {
        renderWithUser(
            <AreaNavigation
                label="Painel do gestor"
                items={MANAGER_AREA_NAVIGATION}
            />,
        );

        const navigation = screen.getByRole("navigation", {
            name: "Painel do gestor",
        });

        expect(navigation).toBeInTheDocument();
        for (const item of MANAGER_AREA_NAVIGATION) {
            expect(
                screen.getByRole("link", { name: item.label }),
            ).toHaveAttribute("href", item.href);
        }
    });

    it("marks only the current item with aria-current", () => {
        usePathname.mockReturnValue("/manager/hotels/hotel-1");

        renderWithUser(
            <AreaNavigation
                label="Painel do gestor"
                items={MANAGER_AREA_NAVIGATION}
            />,
        );

        expect(
            screen.getByRole("link", { name: "Meus hotéis" }),
        ).toHaveAttribute("aria-current", "page");
        expect(
            screen.getByRole("link", { name: "Painel" }),
        ).not.toHaveAttribute("aria-current");
    });

    it("marks the area root on its own path", () => {
        renderWithUser(
            <AreaNavigation
                label="Painel do gestor"
                items={MANAGER_AREA_NAVIGATION}
            />,
        );

        expect(screen.getByRole("link", { name: "Painel" })).toHaveAttribute(
            "aria-current",
            "page",
        );
    });
});

describe("AreaLayout", () => {
    it("renders the area menu next to the page content", () => {
        usePathname.mockReturnValue("/manager");

        renderWithUser(
            <AreaLayout
                title="Painel do gestor"
                items={MANAGER_AREA_NAVIGATION}
            >
                <h1>Conteúdo da área</h1>
            </AreaLayout>,
        );

        expect(
            screen.getByRole("navigation", { name: "Painel do gestor" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { name: "Conteúdo da área" }),
        ).toBeInTheDocument();
    });
});
