import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ApiError, apiFetch } from "../../../src/lib/api-client.js";
import { ERROR_CODES } from "../../../src/lib/errors.js";
import { UnitForm } from "../../../src/modules/units/components/unit-form.jsx";
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

const UNIT = Object.freeze({
    id: "unit-1",
    hotelId: "hotel-1",
    name: "Unidade Centro",
    email: "centro@pousada.com",
    checkInTime: "14:00",
    checkOutTime: "12:00",
    overbookingPercentage: 3,
    isActive: true,
    address: {
        zipCode: "01310100",
        street: "Avenida Paulista",
        number: "1000",
        complement: null,
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
        latitude: null,
        longitude: null,
    },
    phones: [{ id: "phone-1", phone: "11988887777" }],
});

function renderForm({ unit, isEditable = true } = {}) {
    return renderWithUser(
        <UnitForm hotelId="hotel-1" unit={unit} isEditable={isEditable} />,
    );
}

async function fillNewUnit(user) {
    await user.type(screen.getByLabelText(/^Nome/), "Unidade Centro");
    await user.type(screen.getByLabelText(/^E-mail/), "centro@pousada.com");
    fireEvent.change(screen.getByLabelText(/^Check-in/), {
        target: { value: "14:00" },
    });
    fireEvent.change(screen.getByLabelText(/^Check-out/), {
        target: { value: "12:00" },
    });
    await user.clear(screen.getByLabelText(/^Overbooking/));
    await user.type(screen.getByLabelText(/^Overbooking/), "5");
    await user.type(screen.getByLabelText(/^CEP/), "01310100");
    await user.selectOptions(screen.getByLabelText(/^UF/), "SP");
    await user.type(screen.getByLabelText(/^Logradouro/), "Avenida Paulista");
    await user.type(screen.getByLabelText(/^Número/), "1000");
    await user.type(screen.getByLabelText(/^Bairro/), "Bela Vista");
    await user.type(screen.getByLabelText(/^Cidade/), "São Paulo");
    await user.type(screen.getByLabelText(/^Telefone 1/), "11988887777");
}

describe("UnitForm", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("masks the CEP and the phone while typing", async () => {
        const { user } = renderForm();

        await user.type(screen.getByLabelText(/^CEP/), "01310100");
        await user.type(screen.getByLabelText(/^Telefone 1/), "1133334444");

        expect(screen.getByLabelText(/^CEP/)).toHaveValue("01310-100");
        expect(screen.getByLabelText(/^Telefone 1/)).toHaveValue(
            "(11) 3333-4444",
        );
    });

    it("creates a unit sending digits only and no coordinates", async () => {
        apiFetch.mockResolvedValue({ id: "unit-1" });
        const { user } = renderForm();

        await fillNewUnit(user);
        await user.click(
            screen.getByRole("button", { name: "Adicionar telefone" }),
        );
        await user.type(screen.getByLabelText(/^Telefone 2/), "1133334444");
        await user.click(
            screen.getByRole("button", { name: "Cadastrar unidade" }),
        );

        await waitFor(() => {
            expect(apiFetch).toHaveBeenCalledWith("/api/hotels/hotel-1/units", {
                method: "POST",
                body: {
                    name: "Unidade Centro",
                    email: "centro@pousada.com",
                    checkInTime: "14:00",
                    checkOutTime: "12:00",
                    overbookingPercentage: 5,
                    address: {
                        zipCode: "01310100",
                        street: "Avenida Paulista",
                        number: "1000",
                        complement: null,
                        neighborhood: "Bela Vista",
                        city: "São Paulo",
                        state: "SP",
                    },
                    phones: ["11988887777", "1133334444"],
                },
            });
        });
        expect(toast.success).toHaveBeenCalledWith("Unidade cadastrada.");
        expect(router.push).toHaveBeenCalledWith(
            "/manager/hotels/hotel-1/units",
        );
    });

    it("validates the fields on the client", async () => {
        const { user } = renderForm();

        await user.clear(screen.getByLabelText(/^Overbooking/));
        await user.type(screen.getByLabelText(/^Overbooking/), "11");
        await user.click(
            screen.getByRole("button", { name: "Cadastrar unidade" }),
        );

        expect(
            await screen.findByText("O overbooking deve ser no máximo 10%."),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                "Horário de check-in inválido. Use o formato HH:mm.",
            ),
        ).toBeInTheDocument();
        expect(screen.getByText("CEP inválido.")).toBeInTheDocument();
        expect(screen.getByText("Telefone inválido.")).toBeInTheDocument();
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("limits the phones between one and five", async () => {
        const { user } = renderForm();

        expect(
            screen.queryByRole("button", { name: "Remover telefone 1" }),
        ).not.toBeInTheDocument();
        for (let count = 1; count < 5; count += 1) {
            await user.click(
                screen.getByRole("button", { name: "Adicionar telefone" }),
            );
        }

        expect(screen.getByLabelText(/^Telefone 5/)).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Adicionar telefone" }),
        ).not.toBeInTheDocument();

        await user.click(
            screen.getByRole("button", { name: "Remover telefone 5" }),
        );

        expect(screen.queryByLabelText(/^Telefone 5/)).not.toBeInTheDocument();
    });

    it("updates an existing unit from its masked values", async () => {
        apiFetch.mockResolvedValue(UNIT);
        const { user } = renderForm({ unit: UNIT });

        expect(screen.getByLabelText(/^CEP/)).toHaveValue("01310-100");
        expect(screen.getByLabelText(/^Telefone 1/)).toHaveValue(
            "(11) 98888-7777",
        );

        await user.clear(screen.getByLabelText(/^Nome/));
        await user.type(screen.getByLabelText(/^Nome/), "Unidade Paulista");
        await user.click(
            screen.getByRole("button", { name: "Salvar unidade" }),
        );

        await waitFor(() => {
            expect(apiFetch).toHaveBeenCalledWith("/api/units/unit-1", {
                method: "PATCH",
                body: expect.objectContaining({
                    name: "Unidade Paulista",
                    overbookingPercentage: 3,
                    phones: ["11988887777"],
                }),
            });
        });
        expect(apiFetch.mock.calls[0][1].body.address.zipCode).toBe("01310100");
        expect(toast.success).toHaveBeenCalledWith("Unidade atualizada.");
        expect(router.push).not.toHaveBeenCalled();
        expect(router.refresh).toHaveBeenCalled();
    });

    it("shows the server error", async () => {
        apiFetch.mockRejectedValue(
            new ApiError({
                status: 409,
                code: ERROR_CODES.INVALID_HOTEL_STATUS,
                message: "O hotel não pode ser editado.",
            }),
        );
        const { user } = renderForm({ unit: UNIT });

        await user.click(
            screen.getByRole("button", { name: "Salvar unidade" }),
        );

        expect(
            await screen.findByText("O hotel não pode ser editado."),
        ).toBeInTheDocument();
        expect(toast.error).toHaveBeenCalledWith(
            "O hotel não pode ser editado.",
        );
    });

    it("renders read-only fields without actions", () => {
        renderForm({ unit: UNIT, isEditable: false });

        expect(screen.getByLabelText(/^Nome/)).toBeDisabled();
        expect(
            screen.queryByRole("button", { name: "Salvar unidade" }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Adicionar telefone" }),
        ).toBeDisabled();
    });
});
