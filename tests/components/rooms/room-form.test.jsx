import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ROOM_STATUSES } from "../../../src/constants/room-statuses.js";
import { ApiError, apiFetch } from "../../../src/lib/api-client.js";
import { ERROR_CODES } from "../../../src/lib/errors.js";
import { RoomForm } from "../../../src/modules/rooms/components/room-form.jsx";
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

const ROOM_TYPE_OPTIONS = Object.freeze([
    { value: "type-1", label: "Standard" },
    { value: "type-2", label: "Luxo" },
]);

const ROOM = Object.freeze({
    id: "room-1",
    unitId: "unit-1",
    roomTypeId: "type-1",
    number: "101",
    floor: 1,
    isAccessible: false,
    administrativeNotes: "Janela emperrada",
    status: ROOM_STATUSES.AVAILABLE,
    price: "420.50",
    isActive: true,
});

function renderForm({
    room,
    isStructureEditable = true,
    isOperationEditable = true,
} = {}) {
    return renderWithUser(
        <RoomForm
            hotelId="hotel-1"
            unitId="unit-1"
            room={room}
            roomTypeOptions={ROOM_TYPE_OPTIONS}
            isStructureEditable={isStructureEditable}
            isOperationEditable={isOperationEditable}
        />,
    );
}

async function fillNewRoom(user) {
    await user.selectOptions(
        screen.getByLabelText(/^Tipo de acomodação/),
        "type-1",
    );
    await user.type(screen.getByLabelText(/^Número/), "101");
    await user.clear(screen.getByLabelText(/^Andar/));
    await user.type(screen.getByLabelText(/^Andar/), "2");
}

describe("RoomForm", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("creates a room using the type price without sending a price", async () => {
        apiFetch.mockResolvedValue({ id: "room-1" });
        const { user } = renderForm();

        await fillNewRoom(user);
        await user.click(screen.getByLabelText("Quarto acessível"));
        await user.click(
            screen.getByRole("button", { name: "Cadastrar quarto" }),
        );

        await waitFor(() => {
            expect(apiFetch).toHaveBeenCalledWith("/api/units/unit-1/rooms", {
                method: "POST",
                body: {
                    roomTypeId: "type-1",
                    number: "101",
                    floor: 2,
                    isAccessible: true,
                    administrativeNotes: "",
                    status: ROOM_STATUSES.AVAILABLE,
                },
            });
        });
        expect(toast.success).toHaveBeenCalledWith("Quarto cadastrado.");
        expect(router.push).toHaveBeenCalledWith(
            "/manager/hotels/hotel-1/rooms?unit=unit-1",
        );
    });

    it("creates a room with its own price", async () => {
        apiFetch.mockResolvedValue({ id: "room-1" });
        const { user } = renderForm();

        await fillNewRoom(user);
        await user.click(screen.getByLabelText("Usar o preço padrão do tipo"));
        await user.type(screen.getByLabelText(/^Preço próprio/), "350,5");
        await user.click(
            screen.getByRole("button", { name: "Cadastrar quarto" }),
        );

        await waitFor(() => {
            expect(apiFetch).toHaveBeenCalled();
        });
        expect(apiFetch.mock.calls[0][1].body.price).toBe("350.50");
    });

    it("shows the duplicate room number error on the number field", async () => {
        apiFetch.mockRejectedValue(
            new ApiError({
                status: 409,
                code: ERROR_CODES.ROOM_NUMBER_ALREADY_EXISTS,
                message: "Já existe um quarto com este número na unidade.",
            }),
        );
        const { user } = renderForm();

        await fillNewRoom(user);
        await user.click(
            screen.getByRole("button", { name: "Cadastrar quarto" }),
        );

        const numberInput = screen.getByLabelText(/^Número/);
        await waitFor(() => {
            expect(numberInput).toHaveAttribute("aria-invalid", "true");
        });
        expect(
            screen.getByText("Já existe um quarto com este número na unidade."),
        ).toBeInTheDocument();
        expect(toast.error).not.toHaveBeenCalled();
    });

    it("sends a null price to close the own price when switching to the type price", async () => {
        apiFetch.mockResolvedValue(ROOM);
        const { user } = renderForm({ room: ROOM });

        expect(screen.getByLabelText(/^Preço próprio/)).toHaveValue("420,50");
        await user.click(screen.getByLabelText("Usar o preço padrão do tipo"));
        await user.click(screen.getByRole("button", { name: "Salvar quarto" }));

        await waitFor(() => {
            expect(apiFetch).toHaveBeenCalledWith("/api/rooms/room-1", {
                method: "PATCH",
                body: {
                    number: "101",
                    floor: 1,
                    isAccessible: false,
                    administrativeNotes: "Janela emperrada",
                    status: ROOM_STATUSES.AVAILABLE,
                    price: null,
                },
            });
        });
        expect(toast.success).toHaveBeenCalledWith("Quarto atualizado.");
        expect(router.push).not.toHaveBeenCalled();
        expect(router.refresh).toHaveBeenCalled();
    });

    it("allows only the daily operation fields on a published hotel", async () => {
        apiFetch.mockResolvedValue(ROOM);
        const { user } = renderForm({
            room: ROOM,
            isStructureEditable: false,
        });

        expect(screen.getByLabelText(/^Número/)).toBeDisabled();
        expect(screen.getByLabelText(/^Andar/)).toBeDisabled();
        expect(screen.getByLabelText(/^Tipo de acomodação/)).toBeDisabled();
        expect(screen.getByLabelText("Quarto acessível")).toBeDisabled();
        expect(screen.getByLabelText(/^Status/)).toBeEnabled();
        expect(screen.getByLabelText(/^Preço próprio/)).toBeEnabled();

        await user.selectOptions(
            screen.getByLabelText(/^Status/),
            ROOM_STATUSES.MAINTENANCE,
        );
        await user.click(screen.getByRole("button", { name: "Salvar quarto" }));

        await waitFor(() => {
            expect(apiFetch).toHaveBeenCalledWith("/api/rooms/room-1", {
                method: "PATCH",
                body: {
                    administrativeNotes: "Janela emperrada",
                    status: ROOM_STATUSES.MAINTENANCE,
                    price: "420.50",
                },
            });
        });
    });

    it("is read only when the room cannot be changed", () => {
        renderForm({
            room: ROOM,
            isStructureEditable: false,
            isOperationEditable: false,
        });

        expect(screen.getByLabelText(/^Status/)).toBeDisabled();
        expect(screen.getByLabelText(/^Preço próprio/)).toBeDisabled();
        expect(
            screen.queryByRole("button", { name: "Salvar quarto" }),
        ).not.toBeInTheDocument();
    });
});
