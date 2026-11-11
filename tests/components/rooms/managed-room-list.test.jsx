import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ROOM_STATUSES } from "../../../src/constants/room-statuses.js";
import {
    ManagedRoomList,
    UnitSelector,
} from "../../../src/modules/rooms/components/managed-room-list.jsx";

const ROOM = Object.freeze({
    id: "room-1",
    number: "101",
    floor: 0,
    isAccessible: true,
    status: ROOM_STATUSES.MAINTENANCE,
    price: null,
    effectivePrice: "1350.00",
    roomType: { id: "type-1", name: "Suíte Luxo", defaultPrice: "1350.00" },
});

function renderList(props = {}) {
    return render(
        <ManagedRoomList
            hotelId="hotel-1"
            unitId="unit-1"
            items={[ROOM]}
            page={1}
            pageSize={20}
            total={1}
            canCreate
            {...props}
        />,
    );
}

describe("ManagedRoomList", () => {
    it("shows the room data, status and price source", () => {
        renderList();

        expect(
            screen.getByRole("link", { name: "Quarto 101" }),
        ).toHaveAttribute("href", "/manager/hotels/hotel-1/rooms/room-1");
        expect(screen.getByText("Suíte Luxo · Térreo")).toBeInTheDocument();
        expect(
            screen.getByText("R$ 1.350,00 por noite (preço do tipo)"),
        ).toBeInTheDocument();
        expect(screen.getByText("Em manutenção")).toBeInTheDocument();
        expect(screen.getByText("Acessível")).toBeInTheDocument();
    });

    it("marks the own price", () => {
        renderList({
            items: [{ ...ROOM, price: "420.50", effectivePrice: "420.50" }],
        });

        expect(
            screen.getByText("R$ 420,50 por noite (preço próprio)"),
        ).toBeInTheDocument();
    });

    it("offers the create link on an empty unit only when allowed", () => {
        const { unmount } = renderList({ items: [], total: 0 });

        expect(
            screen.getByRole("link", { name: "Cadastrar quarto" }),
        ).toHaveAttribute(
            "href",
            "/manager/hotels/hotel-1/rooms/new?unit=unit-1",
        );
        unmount();

        renderList({ items: [], total: 0, canCreate: false });
        expect(
            screen.queryByRole("link", { name: "Cadastrar quarto" }),
        ).not.toBeInTheDocument();
    });
});

describe("UnitSelector", () => {
    it("links each unit and marks the selected one", () => {
        render(
            <UnitSelector
                hotelId="hotel-1"
                units={[
                    { id: "unit-1", name: "Centro", isActive: true },
                    { id: "unit-2", name: "Praia", isActive: false },
                ]}
                selectedUnitId="unit-1"
            />,
        );

        expect(screen.getByRole("link", { name: "Centro" })).toHaveAttribute(
            "aria-current",
            "page",
        );
        expect(
            screen.getByRole("link", { name: "Praia (inativa)" }),
        ).toHaveAttribute("href", "/manager/hotels/hotel-1/rooms?unit=unit-2");
    });
});
