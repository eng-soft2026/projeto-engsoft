import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HOTEL_STATUSES } from "../../../src/constants/hotel-statuses.js";
import {
    buildManagedHotelsHref,
    ManagedHotelList,
    NEW_HOTEL_HREF,
} from "../../../src/modules/hotels/components/managed-hotel-list.jsx";

const HOTELS = Object.freeze([
    {
        id: "hotel-1",
        name: "Pousada Serra Azul",
        category: "Pousada",
        cnpj: "11222333000181",
        status: HOTEL_STATUSES.DRAFT,
    },
    {
        id: "hotel-2",
        name: "Resort Mar Aberto",
        category: "Resort",
        cnpj: "12ABC34501DE35",
        status: HOTEL_STATUSES.PUBLISHED,
    },
]);

describe("ManagedHotelList", () => {
    it("shows an empty state with a link to create a hotel", () => {
        render(
            <ManagedHotelList items={[]} page={1} pageSize={20} total={0} />,
        );

        expect(
            screen.getByRole("heading", { name: "Nenhum hotel cadastrado" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "Cadastrar hotel" }),
        ).toHaveAttribute("href", NEW_HOTEL_HREF);
        expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });

    it("lists the hotels with their status badge and formatted CNPJ", () => {
        render(
            <ManagedHotelList
                items={HOTELS}
                page={1}
                pageSize={20}
                total={2}
            />,
        );

        const items = screen.getAllByRole("listitem");
        expect(items).toHaveLength(2);
        expect(within(items[0]).getByText("Pousada Serra Azul")).toBeVisible();
        expect(within(items[0]).getByText("Rascunho")).toBeVisible();
        expect(
            within(items[0]).getByText("Pousada · CNPJ 11.222.333/0001-81"),
        ).toBeVisible();
        expect(within(items[1]).getByText("Publicado")).toBeVisible();
        expect(
            within(items[1]).getByText("Resort · CNPJ 12.ABC.345/01DE-35"),
        ).toBeVisible();
        expect(
            screen.queryByRole("navigation", { name: "Paginação" }),
        ).not.toBeInTheDocument();
    });

    it("paginates through the manager hotels page", () => {
        render(
            <ManagedHotelList items={HOTELS} page={2} pageSize={2} total={5} />,
        );

        expect(screen.getByText("Página 2 de 3")).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "Página anterior" }),
        ).toHaveAttribute("href", "/manager/hotels?page=1");
        expect(
            screen.getByRole("link", { name: "Próxima página" }),
        ).toHaveAttribute("href", "/manager/hotels?page=3");
    });

    it("builds the page link", () => {
        expect(buildManagedHotelsHref(4)).toBe("/manager/hotels?page=4");
    });
});
