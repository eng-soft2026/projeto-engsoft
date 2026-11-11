import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HOTEL_STATUSES } from "../../../src/constants/hotel-statuses.js";
import {
    formatReviewNoteDate,
    ManagedHotelHeader,
    READ_ONLY_NOTICES,
} from "../../../src/modules/hotels/components/managed-hotel-header.jsx";

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const REVIEW_NOTES = Object.freeze([
    {
        id: "note-2",
        fromStatus: HOTEL_STATUSES.UNDER_REVIEW,
        toStatus: HOTEL_STATUSES.DRAFT,
        notes: "Envie fotos da fachada.",
        createdAt: "2026-11-10T15:30:00.000Z",
    },
    {
        id: "note-1",
        fromStatus: HOTEL_STATUSES.PUBLISHED,
        toStatus: HOTEL_STATUSES.BLOCKED,
        notes: "Observação antiga.",
        createdAt: "2026-11-01T12:00:00.000Z",
    },
]);

function buildHotel(overrides = {}) {
    return {
        id: "hotel-1",
        name: "Pousada Azul",
        status: HOTEL_STATUSES.DRAFT,
        reviewNotes: [],
        ...overrides,
    };
}

describe("ManagedHotelHeader", () => {
    it("offers the review submission for a draft hotel", () => {
        render(<ManagedHotelHeader hotel={buildHotel()} />);

        expect(
            screen.getByRole("heading", { name: "Pousada Azul" }),
        ).toBeInTheDocument();
        expect(screen.getByText("Rascunho")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Enviar para análise" }),
        ).toBeInTheDocument();
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it.each([
        HOTEL_STATUSES.UNDER_REVIEW,
        HOTEL_STATUSES.PUBLISHED,
        HOTEL_STATUSES.BLOCKED,
    ])("shows a read-only notice for a %s hotel", (status) => {
        render(<ManagedHotelHeader hotel={buildHotel({ status })} />);

        expect(screen.getByRole("status")).toHaveTextContent(
            READ_ONLY_NOTICES[status],
        );
        expect(
            screen.queryByRole("button", { name: "Enviar para análise" }),
        ).not.toBeInTheDocument();
    });

    it("shows only the latest administrator note", () => {
        render(
            <ManagedHotelHeader
                hotel={buildHotel({ reviewNotes: REVIEW_NOTES })}
            />,
        );

        const note = screen.getByRole("region", {
            name: "Última observação do administrador",
        });
        expect(note).toHaveTextContent("Envie fotos da fachada.");
        expect(note).toHaveTextContent("Em análise → Rascunho");
        expect(note).toHaveTextContent(
            formatReviewNoteDate("2026-11-10T15:30:00.000Z"),
        );
        expect(
            screen.queryByText("Observação antiga."),
        ).not.toBeInTheDocument();
    });

    it("hides the note section when there is no note", () => {
        render(<ManagedHotelHeader hotel={buildHotel()} />);

        expect(
            screen.queryByRole("region", {
                name: "Última observação do administrador",
            }),
        ).not.toBeInTheDocument();
    });

    it("formats the note date in the Sao Paulo time zone", () => {
        expect(formatReviewNoteDate("2026-11-10T15:30:00.000Z")).toBe(
            "10/11/2026, 12:30",
        );
    });
});
