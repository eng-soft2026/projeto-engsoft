import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HotelTabs } from "../../../src/modules/hotels/components/hotel-tabs.jsx";

const { pathname } = vi.hoisted(() => ({ pathname: { current: "" } }));

vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

describe("HotelTabs", () => {
    it("links every hotel section and marks the current one", () => {
        pathname.current = "/manager/hotels/hotel-1/rooms";

        render(<HotelTabs hotelId="hotel-1" isOwner />);

        const navigation = screen.getByRole("navigation", {
            name: "Seções do hotel",
        });
        expect(navigation).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Dados" })).toHaveAttribute(
            "href",
            "/manager/hotels/hotel-1",
        );
        expect(screen.getByRole("link", { name: "Quartos" })).toHaveAttribute(
            "aria-current",
            "page",
        );
        expect(screen.getByRole("link", { name: "Dados" })).not.toHaveAttribute(
            "aria-current",
        );
        expect(screen.getAllByRole("link")).toHaveLength(6);
    });

    it("hides the managers tab from additional managers", () => {
        pathname.current = "/manager/hotels/hotel-1";

        render(<HotelTabs hotelId="hotel-1" />);

        expect(
            screen.queryByRole("link", { name: "Gestores" }),
        ).not.toBeInTheDocument();
        expect(screen.getAllByRole("link")).toHaveLength(5);
    });
});
