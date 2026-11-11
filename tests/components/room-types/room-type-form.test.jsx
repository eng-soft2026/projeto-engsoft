import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ApiError, apiFetch } from "../../../src/lib/api-client.js";
import { ERROR_CODES } from "../../../src/lib/errors.js";
import { BED_TYPES } from "../../../src/constants/bed-types.js";
import { RoomTypeForm } from "../../../src/modules/room-types/components/room-type-form.jsx";
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

const ROOM_TYPE = Object.freeze({
    id: "type-1",
    hotelId: "hotel-1",
    name: "Suíte Luxo",
    description: "Suíte com vista para o mar.",
    maxGuests: 3,
    areaM2: "25.50",
    defaultPrice: "350.00",
    isActive: true,
    beds: [{ bedType: BED_TYPES.DOUBLE, quantity: 1 }],
});

function renderForm({
    roomType,
    isStructureEditable = true,
    isPriceEditable = true,
} = {}) {
    return renderWithUser(
        <RoomTypeForm
            hotelId="hotel-1"
            roomType={roomType}
            isStructureEditable={isStructureEditable}
            isPriceEditable={isPriceEditable}
        />,
    );
}

async function fillNewRoomType(user, { price = "350,5" } = {}) {
    await user.type(screen.getByLabelText(/^Nome/), "Suíte Luxo");
    await user.type(
        screen.getByLabelText(/^Descrição/),
        "Suíte com vista para o mar.",
    );
    await user.clear(screen.getByLabelText(/^Capacidade/));
    await user.type(screen.getByLabelText(/^Capacidade/), "3");
    await user.type(screen.getByLabelText(/^Área/), "25.5");
    await user.type(screen.getByLabelText(/^Preço padrão/), price);
    await user.selectOptions(
        screen.getByLabelText(/^Tipo de cama 1/),
        BED_TYPES.DOUBLE,
    );
}

describe("RoomTypeForm", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("creates a room type sending money and area with 2 decimal places", async () => {
        apiFetch.mockResolvedValue({ id: "type-1" });
        const { user } = renderForm();

        await fillNewRoomType(user);
        await user.click(
            screen.getByRole("button", { name: "Adicionar cama" }),
        );
        await user.selectOptions(
            screen.getByLabelText(/^Tipo de cama 2/),
            BED_TYPES.SINGLE,
        );
        await user.clear(screen.getByLabelText(/^Quantidade 2/));
        await user.type(screen.getByLabelText(/^Quantidade 2/), "2");
        await user.click(
            screen.getByRole("button", { name: "Cadastrar tipo" }),
        );

        await waitFor(() => {
            expect(apiFetch).toHaveBeenCalledWith(
                "/api/hotels/hotel-1/room-types",
                {
                    method: "POST",
                    body: {
                        name: "Suíte Luxo",
                        description: "Suíte com vista para o mar.",
                        maxGuests: 3,
                        areaM2: "25.50",
                        defaultPrice: "350.50",
                        beds: [
                            { bedType: BED_TYPES.DOUBLE, quantity: 1 },
                            { bedType: BED_TYPES.SINGLE, quantity: 2 },
                        ],
                    },
                },
            );
        });
        expect(toast.success).toHaveBeenCalledWith(
            "Tipo de acomodação cadastrado.",
        );
        expect(router.push).toHaveBeenCalledWith(
            "/manager/hotels/hotel-1/room-types",
        );
        expect(router.refresh).toHaveBeenCalled();
    });

    it("rejects a price with 3 decimal places without calling the API", async () => {
        const { user } = renderForm();

        await fillNewRoomType(user, { price: "350,999" });
        await user.click(
            screen.getByRole("button", { name: "Cadastrar tipo" }),
        );

        expect(
            await screen.findByText(
                "Valor inválido. Use um número positivo com até 2 casas decimais.",
            ),
        ).toBeInTheDocument();
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("adds and removes bed rows up to the number of bed types", async () => {
        const { user } = renderForm();

        expect(
            screen.queryByRole("button", { name: "Remover cama 1" }),
        ).not.toBeInTheDocument();

        for (let index = 1; index < Object.keys(BED_TYPES).length; index++) {
            await user.click(
                screen.getByRole("button", { name: "Adicionar cama" }),
            );
        }

        expect(
            screen.getByLabelText(
                new RegExp(`^Tipo de cama ${Object.keys(BED_TYPES).length}`),
            ),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Adicionar cama" }),
        ).not.toBeInTheDocument();

        await user.click(
            screen.getByRole("button", { name: "Remover cama 2" }),
        );

        expect(
            screen.getByRole("button", { name: "Adicionar cama" }),
        ).toBeInTheDocument();
    });

    it("flags a repeated bed type", async () => {
        const { user } = renderForm({ roomType: ROOM_TYPE });

        await user.click(
            screen.getByRole("button", { name: "Adicionar cama" }),
        );
        await user.selectOptions(
            screen.getByLabelText(/^Tipo de cama 2/),
            BED_TYPES.DOUBLE,
        );
        await user.click(screen.getByRole("button", { name: "Salvar tipo" }));

        expect(
            await screen.findByText("Tipo de cama repetido."),
        ).toBeInTheDocument();
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("updates every field of a draft room type", async () => {
        apiFetch.mockResolvedValue(ROOM_TYPE);
        const { user } = renderForm({ roomType: ROOM_TYPE });

        expect(screen.getByLabelText(/^Preço padrão/)).toHaveValue("350,00");

        await user.clear(screen.getByLabelText(/^Nome/));
        await user.type(screen.getByLabelText(/^Nome/), "Suíte Master");
        await user.click(screen.getByRole("button", { name: "Salvar tipo" }));

        await waitFor(() => {
            expect(apiFetch).toHaveBeenCalledWith("/api/room-types/type-1", {
                method: "PATCH",
                body: {
                    name: "Suíte Master",
                    description: "Suíte com vista para o mar.",
                    maxGuests: 3,
                    areaM2: "25.50",
                    defaultPrice: "350.00",
                    beds: [{ bedType: BED_TYPES.DOUBLE, quantity: 1 }],
                },
            });
        });
        expect(router.push).not.toHaveBeenCalled();
        expect(router.refresh).toHaveBeenCalled();
    });

    it("sends only the default price of a published hotel", async () => {
        apiFetch.mockResolvedValue(ROOM_TYPE);
        const { user } = renderForm({
            roomType: ROOM_TYPE,
            isStructureEditable: false,
        });

        expect(screen.getByLabelText(/^Nome/)).toBeDisabled();
        expect(screen.getByLabelText(/^Tipo de cama 1/)).toBeDisabled();
        expect(
            screen.getByRole("button", { name: "Adicionar cama" }),
        ).toBeDisabled();
        expect(
            screen.getByText(
                "Com o hotel publicado, apenas o preço padrão pode ser alterado.",
            ),
        ).toBeInTheDocument();

        await user.clear(screen.getByLabelText(/^Preço padrão/));
        await user.type(screen.getByLabelText(/^Preço padrão/), "410.9");
        await user.click(screen.getByRole("button", { name: "Salvar tipo" }));

        await waitFor(() => {
            expect(apiFetch).toHaveBeenCalledWith("/api/room-types/type-1", {
                method: "PATCH",
                body: { defaultPrice: "410.90" },
            });
        });
        expect(toast.success).toHaveBeenCalledWith(
            "Tipo de acomodação atualizado.",
        );
    });

    it("renders read-only without a submit button", () => {
        renderForm({
            roomType: ROOM_TYPE,
            isStructureEditable: false,
            isPriceEditable: false,
        });

        expect(screen.getByLabelText(/^Preço padrão/)).toBeDisabled();
        expect(
            screen.queryByRole("button", { name: "Salvar tipo" }),
        ).not.toBeInTheDocument();
    });

    it("shows the API error", async () => {
        apiFetch.mockRejectedValue(
            new ApiError({
                status: 409,
                code: ERROR_CODES.INVALID_HOTEL_STATUS,
                message: "O status atual do hotel não permite esta ação.",
            }),
        );
        const { user } = renderForm({ roomType: ROOM_TYPE });

        await user.click(screen.getByRole("button", { name: "Salvar tipo" }));

        expect(await screen.findByRole("alert")).toBeInTheDocument();
        expect(toast.error).toHaveBeenCalled();
        expect(router.refresh).not.toHaveBeenCalled();
    });
});
