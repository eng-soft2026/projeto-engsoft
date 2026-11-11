import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ManagedUnitList } from "../../../src/modules/units/components/managed-unit-list.jsx";

const UNIT = Object.freeze({
    id: "unit-1",
    name: "Unidade Centro",
    checkInTime: "14:00",
    checkOutTime: "12:00",
    overbookingPercentage: 5,
    isActive: true,
    address: {
        street: "Avenida Paulista",
        number: "1000",
        city: "São Paulo",
        state: "SP",
    },
});

function renderList(props = {}) {
    return render(
        <ManagedUnitList
            hotelId="hotel-1"
            items={[UNIT]}
            page={1}
            pageSize={20}
            total={1}
            isEditable
            {...props}
        />,
    );
}

describe("ManagedUnitList", () => {
    it("lists the units with address, times and overbooking", () => {
        renderList({
            items: [UNIT, { ...UNIT, id: "unit-2", isActive: false }],
            total: 2,
        });

        expect(
            screen.getAllByRole("link", { name: "Unidade Centro" })[0],
        ).toHaveAttribute("href", "/manager/hotels/hotel-1/units/unit-1");
        expect(
            screen.getAllByText("Avenida Paulista, 1000 · São Paulo/SP"),
        ).toHaveLength(2);
        expect(
            screen.getAllByText(
                "Check-in 14:00 · Check-out 12:00 · Overbooking 5%",
            ),
        ).toHaveLength(2);
        expect(screen.getByText("Ativa")).toBeInTheDocument();
        expect(screen.getByText("Inativa")).toBeInTheDocument();
    });

    it("paginates through the hotel units route", () => {
        renderList({ total: 41, page: 2 });

        expect(
            screen.getByRole("link", { name: "Próxima página" }),
        ).toHaveAttribute("href", "/manager/hotels/hotel-1/units?page=3");
    });

    it("offers the create link on an empty draft hotel", () => {
        renderList({ items: [], total: 0 });

        expect(
            screen.getByRole("link", { name: "Cadastrar unidade" }),
        ).toHaveAttribute("href", "/manager/hotels/hotel-1/units/new");
    });

    it("hides the create link outside draft", () => {
        renderList({ items: [], total: 0, isEditable: false });

        expect(
            screen.getByText("Nenhuma unidade cadastrada"),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("link", { name: "Cadastrar unidade" }),
        ).not.toBeInTheDocument();
    });
});
