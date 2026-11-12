import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HOTEL_STATUSES } from "../../../src/constants/hotel-statuses.js";
import { ALL_STATUSES_FILTER } from "../../../src/modules/hotels/admin-hotel-filters.js";
import {
    AdminHotelList,
    AdminHotelStatusFilter,
    formatHotelUpdatedAt,
} from "../../../src/modules/hotels/components/admin-hotel-list.jsx";

const HOTELS = Object.freeze([
    {
        id: "hotel-1",
        name: "Pousada Serra Azul",
        category: "Pousada",
        cnpj: "11222333000181",
        status: HOTEL_STATUSES.UNDER_REVIEW,
        updatedAt: "2026-11-10T15:30:00.000Z",
        owner: {
            id: "manager-1",
            name: "Ana Gestora",
            email: "ana@example.com",
        },
    },
]);

describe("AdminHotelStatusFilter", () => {
    it("links every status filter and marks the current one", () => {
        render(<AdminHotelStatusFilter filter={HOTEL_STATUSES.BLOCKED} />);

        const navigation = screen.getByRole("navigation", {
            name: "Filtrar por status",
        });
        const links = within(navigation).getAllByRole("link");

        expect(links.map((link) => link.textContent)).toEqual([
            "Em análise",
            "Publicados",
            "Bloqueados",
            "Rascunhos",
            "Todos",
        ]);
        expect(
            screen.getByRole("link", { name: "Bloqueados" }),
        ).toHaveAttribute("aria-current", "page");
        expect(
            screen.getByRole("link", { name: "Em análise" }),
        ).not.toHaveAttribute("aria-current");
        expect(screen.getByRole("link", { name: "Todos" })).toHaveAttribute(
            "href",
            "/admin/hotels?status=ALL",
        );
    });
});

describe("AdminHotelList", () => {
    it.each([
        [HOTEL_STATUSES.UNDER_REVIEW, "Nenhum hotel aguardando análise"],
        [HOTEL_STATUSES.BLOCKED, "Nenhum hotel bloqueado"],
        [ALL_STATUSES_FILTER, "Nenhum hotel cadastrado"],
    ])("shows an empty state for the %s filter", (filter, title) => {
        render(
            <AdminHotelList
                items={[]}
                filter={filter}
                page={1}
                pageSize={20}
                total={0}
            />,
        );

        expect(
            screen.getByRole("heading", { name: title }),
        ).toBeInTheDocument();
        expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });

    it("lists the hotel with its owner, CNPJ, update date and status", () => {
        render(
            <AdminHotelList
                items={HOTELS}
                filter={HOTEL_STATUSES.UNDER_REVIEW}
                page={1}
                pageSize={20}
                total={1}
            />,
        );

        const item = screen.getByRole("listitem");

        expect(
            within(item).getByText("Pousada Serra Azul"),
        ).toBeInTheDocument();
        expect(
            within(item).getByText("Pousada · CNPJ 11.222.333/0001-81"),
        ).toBeInTheDocument();
        expect(
            within(item).getByText(
                "Proprietário: Ana Gestora (ana@example.com)",
            ),
        ).toBeInTheDocument();
        expect(
            within(item).getByText(
                `Atualizado em ${formatHotelUpdatedAt(HOTELS[0].updatedAt)}`,
            ),
        ).toBeInTheDocument();
        expect(within(item).getByText("Em análise")).toBeInTheDocument();
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it("keeps the status filter in the pagination links", () => {
        render(
            <AdminHotelList
                items={HOTELS}
                filter={HOTEL_STATUSES.PUBLISHED}
                page={2}
                pageSize={20}
                total={45}
            />,
        );

        const hrefs = screen
            .getAllByRole("link")
            .map((link) => link.getAttribute("href"));

        expect(hrefs).toContain("/admin/hotels?status=PUBLISHED");
        expect(hrefs).toContain("/admin/hotels?status=PUBLISHED&page=3");
    });

    it("formats the update date in Brazilian time", () => {
        expect(formatHotelUpdatedAt("2026-11-10T15:30:00.000Z")).toBe(
            "10/11/2026, 12:30",
        );
    });
});
