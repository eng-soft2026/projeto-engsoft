import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { HOTEL_STATUSES } from "../../../src/constants/hotel-statuses.js";
import { ApiError, apiFetch } from "../../../src/lib/api-client.js";
import { ERROR_CODES } from "../../../src/lib/errors.js";
import {
    CreateHotelForm,
    MANAGED_HOTELS_HREF,
} from "../../../src/modules/hotels/components/create-hotel-form.jsx";
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

async function fillForm(user, { cnpj = "11222333000181" } = {}) {
    await user.type(screen.getByLabelText(/^Nome do hotel/), "Pousada Azul");
    await user.type(
        screen.getByLabelText(/^Descrição/),
        "Pousada perto da praia.",
    );
    await user.type(screen.getByLabelText(/^Categoria/), "Pousada");
    await user.type(screen.getByLabelText(/^CNPJ/), cnpj);
    await user.type(
        screen.getByLabelText(/^E-mail do hotel/),
        "Contato@Pousada.com",
    );
}

function submit(user) {
    return user.click(screen.getByRole("button", { name: "Cadastrar hotel" }));
}

describe("CreateHotelForm", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("masks the CNPJ while typing, including alphanumeric ones", async () => {
        const { user } = renderWithUser(<CreateHotelForm />);
        const cnpj = screen.getByLabelText(/^CNPJ/);

        await user.type(cnpj, "12abc34501de35");

        expect(cnpj).toHaveValue("12.ABC.345/01DE-35");
    });

    it("rejects an invalid CNPJ without calling the API", async () => {
        const { user } = renderWithUser(<CreateHotelForm />);

        await fillForm(user, { cnpj: "11222333000182" });
        await submit(user);

        expect(await screen.findByText("CNPJ inválido.")).toBeInTheDocument();
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("requires the hotel fields", async () => {
        const { user } = renderWithUser(<CreateHotelForm />);

        await submit(user);

        expect(
            await screen.findByText("Informe a descrição do hotel."),
        ).toBeInTheDocument();
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("creates the hotel and redirects to the hotel list", async () => {
        apiFetch.mockResolvedValue({
            id: "hotel-1",
            status: HOTEL_STATUSES.DRAFT,
        });
        const { user } = renderWithUser(<CreateHotelForm />);

        await fillForm(user);
        await submit(user);

        await waitFor(() =>
            expect(router.push).toHaveBeenCalledWith(MANAGED_HOTELS_HREF),
        );
        expect(router.refresh).toHaveBeenCalled();
        expect(apiFetch).toHaveBeenCalledWith("/api/hotels", {
            method: "POST",
            body: {
                name: "Pousada Azul",
                description: "Pousada perto da praia.",
                category: "Pousada",
                cnpj: "11222333000181",
                email: "contato@pousada.com",
            },
        });
        expect(toast.success).toHaveBeenCalledWith(
            "Hotel cadastrado como rascunho.",
        );
    });

    it("shows the API CNPJ error on the field", async () => {
        apiFetch.mockRejectedValue(
            new ApiError({
                status: 422,
                code: ERROR_CODES.INVALID_CNPJ,
                message: "CNPJ inválido.",
            }),
        );
        const { user } = renderWithUser(<CreateHotelForm />);

        await fillForm(user);
        await submit(user);

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "CNPJ inválido.",
        );
        expect(screen.getByLabelText(/^CNPJ/)).toHaveAttribute(
            "aria-invalid",
            "true",
        );
        expect(router.push).not.toHaveBeenCalled();
    });
});
