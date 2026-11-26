import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HOTEL_STATUSES } from "../../../src/constants/hotel-statuses.js";
import { ALL_STATUSES_FILTER } from "../../../src/modules/hotels/admin-hotel-filters.js";
import {
    AdminHotelList,
    AdminHotelStatusFilter,
    formatHotelUpdatedAt,
} from "../../../src/modules/hotels/components/admin-hotel-list.jsx";
import { renderWithUser } from "../../helpers/render.jsx";

vi.mock("next/navigation", () => ({
    useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

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

const BLOCK_NOTE = Object.freeze({
    notes: "Fotos com marca d'água de outro hotel.",
    createdAt: "2026-11-20T12:00:00.000Z",
});

function buildBlockedHotel(overrides = {}) {
    return {
        ...HOTELS[0],
        status: HOTEL_STATUSES.BLOCKED,
        lastBlockNote: BLOCK_NOTE,
        ...overrides,
    };
}

function renderBlockedList(items) {
    return renderWithUser(
        <AdminHotelList
            items={items}
            filter={HOTEL_STATUSES.BLOCKED}
            page={1}
            pageSize={20}
            total={items.length}
        />,
    );
}

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
            within(item).getByRole("link", { name: "Pousada Serra Azul" }),
        ).toHaveAttribute("href", "/admin/hotels/hotel-1");
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
        expect(screen.getAllByRole("link")).toHaveLength(1);
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

    it("shows the last block reason and only the unblock action in the blocked filter", () => {
        renderBlockedList([buildBlockedHotel()]);

        const item = screen.getByRole("listitem");

        expect(within(item).getByText(BLOCK_NOTE.notes)).toBeInTheDocument();
        expect(
            within(item).getByText(formatHotelUpdatedAt(BLOCK_NOTE.createdAt)),
        ).toHaveAttribute("datetime", BLOCK_NOTE.createdAt);
        expect(
            within(item)
                .getAllByRole("button")
                .map((button) => button.textContent),
        ).toEqual(["Desbloquear"]);
    });

    it("says when a blocked hotel has no recorded reason", () => {
        renderBlockedList([buildBlockedHotel({ lastBlockNote: null })]);

        expect(
            screen.getByText("Motivo do bloqueio não registrado."),
        ).toBeInTheDocument();
    });

    it("opens the unblock dialog from the blocked list", async () => {
        const { user } = renderBlockedList([buildBlockedHotel()]);

        await user.click(screen.getByRole("button", { name: "Desbloquear" }));

        const dialog = screen.getByRole("dialog", {
            name: "Desbloquear o hotel?",
        });
        expect(within(dialog).getByLabelText(/Motivo/)).toBeInTheDocument();
        expect(
            within(dialog).getByLabelText(/Status de destino/),
        ).toBeInTheDocument();
    });

    it("keeps blocked hotels without reason or actions in the other filters", () => {
        render(
            <AdminHotelList
                items={[buildBlockedHotel()]}
                filter={ALL_STATUSES_FILTER}
                page={1}
                pageSize={20}
                total={1}
            />,
        );

        expect(screen.queryByText(BLOCK_NOTE.notes)).not.toBeInTheDocument();
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("formats the update date in Brazilian time", () => {
        expect(formatHotelUpdatedAt("2026-11-10T15:30:00.000Z")).toBe(
            "10/11/2026, 12:30",
        );
    });
});
