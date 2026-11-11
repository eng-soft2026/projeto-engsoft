import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { HOTEL_STATUSES } from "../../../src/constants/hotel-statuses.js";
import { apiFetch } from "../../../src/lib/api-client.js";
import { EditHotelForm } from "../../../src/modules/hotels/components/edit-hotel-form.jsx";
import { renderWithUser } from "../../helpers/render.jsx";

const { router } = vi.hoisted(() => ({
    router: { replace: vi.fn(), push: vi.fn(), refresh: vi.fn() },
}));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../../../src/lib/api-client.js", async (importOriginal) => ({
    ...(await importOriginal()),
    apiFetch: vi.fn(),
}));

function buildHotel(overrides = {}) {
    return {
        id: "hotel-1",
        status: HOTEL_STATUSES.DRAFT,
        name: "Pousada Azul",
        description: "Pousada perto da praia.",
        category: "Pousada",
        cnpj: "11222333000181",
        email: "contato@pousada.com",
        ...overrides,
    };
}

const FIELD_LABELS = [
    /^Nome do hotel/,
    /^Descrição/,
    /^Categoria/,
    /^CNPJ/,
    /^E-mail do hotel/,
];

describe("EditHotelForm", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("fills the form with the hotel data and a formatted CNPJ", () => {
        renderWithUser(<EditHotelForm hotel={buildHotel()} />);

        expect(screen.getByLabelText(/^Nome do hotel/)).toHaveValue(
            "Pousada Azul",
        );
        expect(screen.getByLabelText(/^CNPJ/)).toHaveValue(
            "11.222.333/0001-81",
        );
    });

    it("saves the changes of a draft hotel", async () => {
        apiFetch.mockResolvedValue(buildHotel({ name: "Pousada Verde" }));
        const { user } = renderWithUser(<EditHotelForm hotel={buildHotel()} />);
        const name = screen.getByLabelText(/^Nome do hotel/);

        await user.clear(name);
        await user.type(name, "Pousada Verde");
        await user.click(
            screen.getByRole("button", { name: "Salvar alterações" }),
        );

        await waitFor(() => expect(router.refresh).toHaveBeenCalled());
        expect(apiFetch).toHaveBeenCalledWith("/api/hotels/hotel-1", {
            method: "PATCH",
            body: {
                name: "Pousada Verde",
                description: "Pousada perto da praia.",
                category: "Pousada",
                cnpj: "11222333000181",
                email: "contato@pousada.com",
            },
        });
        expect(toast.success).toHaveBeenCalledWith(
            "Dados do hotel atualizados.",
        );
    });

    it.each([
        HOTEL_STATUSES.UNDER_REVIEW,
        HOTEL_STATUSES.PUBLISHED,
        HOTEL_STATUSES.BLOCKED,
    ])("disables every field of a %s hotel", (status) => {
        renderWithUser(<EditHotelForm hotel={buildHotel({ status })} />);

        for (const label of FIELD_LABELS) {
            expect(screen.getByLabelText(label)).toBeDisabled();
        }
        expect(
            screen.queryByRole("button", { name: "Salvar alterações" }),
        ).not.toBeInTheDocument();
    });
});
