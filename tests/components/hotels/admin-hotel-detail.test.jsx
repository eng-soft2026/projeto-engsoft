import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HOTEL_STATUSES } from "../../../src/constants/hotel-statuses.js";
import {
    AdminAmenitiesSection,
    AdminHotelSummary,
    AdminReviewNoteHistory,
    AdminRoomTypesSection,
    AdminUnitsSection,
    formatUnitAddress,
} from "../../../src/modules/hotels/components/admin-hotel-detail.jsx";

const HOTEL = Object.freeze({
    id: "hotel-1",
    name: "Pousada Serra Azul",
    description: "Pousada na serra.",
    category: "Pousada",
    cnpj: "11222333000181",
    email: "contato@example.com",
    status: HOTEL_STATUSES.UNDER_REVIEW,
    updatedAt: "2026-11-10T15:30:00.000Z",
    owner: { id: "manager-1", name: "Ana Gestora", email: "ana@example.com" },
    managers: [{ id: "manager-2", name: "Bia", email: "bia@example.com" }],
});

const ADDRESS = Object.freeze({
    zipCode: "01310100",
    street: "Avenida Paulista",
    number: "1000",
    complement: null,
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
});

const UNIT = Object.freeze({
    id: "unit-1",
    name: "Unidade Centro",
    email: "centro@example.com",
    checkInTime: "14:00",
    checkOutTime: "12:00",
    overbookingPercentage: 5,
    isActive: true,
    address: ADDRESS,
    phones: [{ id: "phone-1", phone: "11987654321" }],
    rooms: [
        {
            id: "room-1",
            number: "101",
            floor: 1,
            status: "AVAILABLE",
            isAccessible: true,
            isActive: true,
            price: null,
            effectivePrice: "250.00",
            roomType: { id: "type-1", name: "Standard" },
        },
    ],
});

describe("AdminHotelSummary", () => {
    it("shows the hotel data with owner and additional managers", () => {
        render(<AdminHotelSummary hotel={HOTEL} />);

        expect(screen.getByText("11.222.333/0001-81")).toBeInTheDocument();
        expect(
            screen.getByText("Ana Gestora (ana@example.com)"),
        ).toBeInTheDocument();
        expect(screen.getByText("Bia (bia@example.com)")).toBeInTheDocument();
        expect(screen.getByText("Pousada na serra.")).toBeInTheDocument();
    });

    it("says when there is no additional manager", () => {
        render(<AdminHotelSummary hotel={{ ...HOTEL, managers: [] }} />);

        expect(screen.getByText("Nenhum")).toBeInTheDocument();
    });
});

describe("AdminReviewNoteHistory", () => {
    it("lists every review note with its transition", () => {
        render(
            <AdminReviewNoteHistory
                notes={[
                    {
                        id: "note-2",
                        fromStatus: HOTEL_STATUSES.BLOCKED,
                        toStatus: HOTEL_STATUSES.DRAFT,
                        notes: "Trocar as fotos.",
                        createdAt: "2026-11-12T10:00:00.000Z",
                    },
                    {
                        id: "note-1",
                        fromStatus: HOTEL_STATUSES.PUBLISHED,
                        toStatus: HOTEL_STATUSES.BLOCKED,
                        notes: "Fotos de outro hotel.",
                        createdAt: "2026-11-11T10:00:00.000Z",
                    },
                ]}
            />,
        );

        const items = screen.getAllByRole("listitem");

        expect(items).toHaveLength(2);
        expect(within(items[0]).getByText("Trocar as fotos.")).toBeVisible();
        expect(items[1]).toHaveTextContent("Publicado → Bloqueado");
    });

    it("shows an empty message without notes", () => {
        render(<AdminReviewNoteHistory notes={[]} />);

        expect(
            screen.getByText("Nenhuma observação registrada."),
        ).toBeInTheDocument();
    });
});

describe("AdminUnitsSection", () => {
    it("shows each unit with address, contact and its rooms", () => {
        render(<AdminUnitsSection units={[UNIT]} />);

        expect(screen.getByText(formatUnitAddress(ADDRESS))).toBeVisible();
        expect(
            screen.getByText(/Check-in 14:00 · Check-out 12:00/),
        ).toBeInTheDocument();
        const rooms = screen.getByRole("list", {
            name: "Quartos de Unidade Centro",
        });
        expect(rooms).toHaveTextContent("Quarto 101");
        expect(rooms).toHaveTextContent("Acessível");
        expect(rooms).toHaveTextContent(
            "Standard · R$ 250,00 por noite (preço do tipo)",
        );
    });

    it("shows empty messages for no units and no rooms", () => {
        const { rerender } = render(<AdminUnitsSection units={[]} />);
        expect(
            screen.getByText("Nenhuma unidade cadastrada."),
        ).toBeInTheDocument();

        rerender(<AdminUnitsSection units={[{ ...UNIT, rooms: [] }]} />);
        expect(
            screen.getByText("Nenhum quarto cadastrado nesta unidade."),
        ).toBeInTheDocument();
    });

    it("formats the address with complement and zip code", () => {
        expect(formatUnitAddress({ ...ADDRESS, complement: "Bloco B" })).toBe(
            "Avenida Paulista, 1000 (Bloco B) · Bela Vista · São Paulo/SP · CEP 01310-100",
        );
    });
});

describe("AdminRoomTypesSection", () => {
    it("shows the room type with capacity, area, beds and price", () => {
        render(
            <AdminRoomTypesSection
                roomTypes={[
                    {
                        id: "type-1",
                        name: "Standard",
                        description: null,
                        maxGuests: 2,
                        areaM2: "20.50",
                        defaultPrice: "250.00",
                        isActive: false,
                        beds: [{ bedType: "DOUBLE", quantity: 1 }],
                    },
                ]}
            />,
        );

        expect(
            screen.getByText("Até 2 hóspedes · 20,50 m² · 1× Casal"),
        ).toBeInTheDocument();
        expect(screen.getByText("Inativo")).toBeInTheDocument();
    });

    it("shows an empty message without room types", () => {
        render(<AdminRoomTypesSection roomTypes={[]} />);

        expect(
            screen.getByText("Nenhum tipo de acomodação cadastrado."),
        ).toBeInTheDocument();
    });
});

describe("AdminAmenitiesSection", () => {
    it("lists the hotel amenities", () => {
        render(
            <AdminAmenitiesSection
                amenities={[
                    { id: "a-1", name: "Wi-Fi", isGlobal: true },
                    { id: "a-2", name: "Ofurô", isGlobal: false },
                ]}
            />,
        );

        expect(
            screen.getAllByRole("listitem").map((item) => item.textContent),
        ).toEqual(["Wi-Fi", "Ofurô"]);
    });

    it("shows an empty message without amenities", () => {
        render(<AdminAmenitiesSection amenities={[]} />);

        expect(
            screen.getByText("Nenhuma comodidade associada."),
        ).toBeInTheDocument();
    });
});
