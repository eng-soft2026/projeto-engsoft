import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BED_TYPES } from "../../../src/constants/bed-types.js";
import { ManagedRoomTypeList } from "../../../src/modules/room-types/components/managed-room-type-list.jsx";

const ROOM_TYPE = Object.freeze({
    id: "type-1",
    name: "Suíte Luxo",
    maxGuests: 3,
    areaM2: "25.50",
    defaultPrice: "1350.00",
    isActive: true,
    beds: [
        { bedType: BED_TYPES.DOUBLE, quantity: 1 },
        { bedType: BED_TYPES.SINGLE, quantity: 1 },
    ],
});

function renderList(props = {}) {
    return render(
        <ManagedRoomTypeList
            hotelId="hotel-1"
            items={[ROOM_TYPE]}
            page={1}
            pageSize={20}
            total={1}
            isEditable
            {...props}
        />,
    );
}

describe("ManagedRoomTypeList", () => {
    it("lists capacity, area, beds, price and status", () => {
        renderList({
            items: [ROOM_TYPE, { ...ROOM_TYPE, id: "type-2", isActive: false }],
            total: 2,
        });

        expect(
            screen.getAllByRole("link", { name: "Suíte Luxo" })[0],
        ).toHaveAttribute("href", "/manager/hotels/hotel-1/room-types/type-1");
        expect(
            screen.getAllByText(
                "Até 3 hóspedes · 25,50 m² · 1× Casal, 1× Solteiro",
            ),
        ).toHaveLength(2);
        expect(screen.getAllByText("R$ 1.350,00 por noite")).toHaveLength(2);
        expect(screen.getByText("Ativo")).toBeInTheDocument();
        expect(screen.getByText("Inativo")).toBeInTheDocument();
    });

    it("offers the create link on an empty editable list", () => {
        renderList({ items: [], total: 0 });

        expect(
            screen.getByText("Nenhum tipo de acomodação cadastrado"),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "Cadastrar tipo" }),
        ).toHaveAttribute("href", "/manager/hotels/hotel-1/room-types/new");
    });

    it("hides the create link on an empty read-only list", () => {
        renderList({ items: [], total: 0, isEditable: false });

        expect(
            screen.queryByRole("link", { name: "Cadastrar tipo" }),
        ).not.toBeInTheDocument();
    });
});
