import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { AMENITY_TARGETS } from "../../../src/constants/amenity.js";
import { ApiError, apiFetch } from "../../../src/lib/api-client.js";
import { ERROR_CODES } from "../../../src/lib/errors.js";
import { AmenityPicker } from "../../../src/modules/amenities/components/amenity-picker.jsx";
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

const WIFI = Object.freeze({
    id: "amenity-1",
    name: "Wi-Fi",
    isGlobal: true,
    isActive: true,
});
const POOL = Object.freeze({
    id: "amenity-2",
    name: "Piscina",
    isGlobal: true,
    isActive: true,
});
const HAMMOCK = Object.freeze({
    id: "amenity-3",
    name: "Rede de descanso",
    isGlobal: false,
    isActive: false,
});

function renderPicker({
    target = AMENITY_TARGETS.HOTEL,
    targetId = "hotel-1",
    amenities = [POOL, HAMMOCK, WIFI],
    selectedIds = [WIFI.id],
    isEditable = true,
} = {}) {
    return renderWithUser(
        <AmenityPicker
            target={target}
            targetId={targetId}
            amenities={amenities}
            selectedIds={selectedIds}
            isEditable={isEditable}
        />,
    );
}

function getSaveButton() {
    return screen.getByRole("button", { name: "Salvar comodidades" });
}

describe("AmenityPicker", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("lists the amenities with the current selection and badges", () => {
        renderPicker();

        expect(screen.getByRole("checkbox", { name: "Wi-Fi" })).toBeChecked();
        expect(
            screen.getByRole("checkbox", { name: "Piscina" }),
        ).not.toBeChecked();
        expect(screen.getByText("Própria")).toBeInTheDocument();
        expect(screen.getByText("Inativa")).toBeInTheDocument();
        expect(
            screen.getByText("1 comodidade selecionada"),
        ).toBeInTheDocument();
    });

    it("filters the amenities by name ignoring case and accents", async () => {
        const { user } = renderPicker({
            amenities: [{ ...POOL, name: "Café da manhã" }, WIFI],
        });

        await user.type(screen.getByLabelText("Buscar comodidade"), "CAFE");

        expect(
            screen.getByRole("checkbox", { name: "Café da manhã" }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("checkbox", { name: "Wi-Fi" }),
        ).not.toBeInTheDocument();

        await user.clear(screen.getByLabelText("Buscar comodidade"));
        await user.type(screen.getByLabelText("Buscar comodidade"), "sauna");

        expect(
            screen.getByText("Nenhuma comodidade encontrada."),
        ).toBeInTheDocument();
    });

    it("sends the whole selected set and refreshes", async () => {
        apiFetch.mockResolvedValue([POOL, WIFI]);
        const { user } = renderPicker();

        await user.click(screen.getByRole("checkbox", { name: "Piscina" }));
        await user.click(getSaveButton());

        await waitFor(() =>
            expect(apiFetch).toHaveBeenCalledWith(
                "/api/hotels/hotel-1/amenities",
                {
                    method: "PUT",
                    body: { amenityIds: [POOL.id, WIFI.id] },
                },
            ),
        );
        expect(toast.success).toHaveBeenCalledWith("Comodidades salvas.");
        expect(router.refresh).toHaveBeenCalled();
    });

    it("unchecks an amenity and clears the selection", async () => {
        apiFetch.mockResolvedValue([]);
        const { user } = renderPicker({ selectedIds: [WIFI.id, POOL.id] });

        await user.click(screen.getByRole("checkbox", { name: "Wi-Fi" }));
        expect(
            screen.getByText("1 comodidade selecionada"),
        ).toBeInTheDocument();

        await user.click(
            screen.getByRole("button", { name: "Limpar seleção" }),
        );
        expect(
            screen.getByText("0 comodidades selecionadas"),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Limpar seleção" }),
        ).toBeDisabled();

        await user.click(getSaveButton());

        await waitFor(() =>
            expect(apiFetch).toHaveBeenCalledWith(
                "/api/hotels/hotel-1/amenities",
                { method: "PUT", body: { amenityIds: [] } },
            ),
        );
    });

    it.each([
        [AMENITY_TARGETS.UNIT, "unit-1", "/api/units/unit-1/amenities"],
        [
            AMENITY_TARGETS.ROOM_TYPE,
            "type-1",
            "/api/room-types/type-1/amenities",
        ],
        [AMENITY_TARGETS.ROOM, "room-1", "/api/rooms/room-1/amenities"],
    ])("saves the %s amenities on its route", async (target, id, path) => {
        apiFetch.mockResolvedValue([WIFI]);
        const { user } = renderPicker({ target, targetId: id });

        await user.click(getSaveButton());

        await waitFor(() =>
            expect(apiFetch).toHaveBeenCalledWith(path, {
                method: "PUT",
                body: { amenityIds: [WIFI.id] },
            }),
        );
    });

    it("shows the server error when saving fails", async () => {
        apiFetch.mockRejectedValue(
            new ApiError({
                status: 409,
                code: ERROR_CODES.INVALID_HOTEL_STATUS,
                message: "server message",
            }),
        );
        const { user } = renderPicker();

        await user.click(getSaveButton());

        expect(await screen.findByRole("alert")).toBeInTheDocument();
        expect(toast.error).toHaveBeenCalled();
        expect(router.refresh).not.toHaveBeenCalled();
    });

    it("creates an own amenity and selects it", async () => {
        const created = {
            id: "amenity-9",
            name: "Bicicletas",
            isGlobal: false,
            isActive: true,
            createdAt: "2026-11-11T00:00:00.000Z",
        };
        apiFetch.mockResolvedValue(created);
        const { user } = renderPicker();

        await user.type(
            screen.getByLabelText(/^Nova comodidade/),
            "Bicicletas",
        );
        await user.click(
            screen.getByRole("button", { name: "Criar comodidade" }),
        );

        await waitFor(() =>
            expect(apiFetch).toHaveBeenCalledWith("/api/amenities", {
                method: "POST",
                body: { name: "Bicicletas" },
            }),
        );
        expect(
            await screen.findByRole("checkbox", { name: "Bicicletas" }),
        ).toBeChecked();
        expect(toast.success).toHaveBeenCalledWith("Comodidade criada.");
        expect(screen.getByLabelText(/^Nova comodidade/)).toHaveValue("");
    });

    it("shows the duplicate name error on the new amenity field", async () => {
        apiFetch.mockRejectedValue(
            new ApiError({
                status: 409,
                code: ERROR_CODES.AMENITY_ALREADY_EXISTS,
                message: "server message",
            }),
        );
        const { user } = renderPicker();

        await user.type(screen.getByLabelText(/^Nova comodidade/), "Wi-Fi");
        await user.click(
            screen.getByRole("button", { name: "Criar comodidade" }),
        );

        expect(
            await screen.findByText("Já existe uma comodidade com este nome."),
        ).toBeInTheDocument();
        expect(screen.getAllByRole("checkbox", { name: "Wi-Fi" })).toHaveLength(
            1,
        );
    });

    it("validates the new amenity name before sending", async () => {
        const { user } = renderPicker();

        await user.type(screen.getByLabelText(/^Nova comodidade/), "a");
        await user.click(
            screen.getByRole("button", { name: "Criar comodidade" }),
        );

        expect(
            await screen.findByText("O nome deve ter pelo menos 2 caracteres."),
        ).toBeInTheDocument();
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("is read-only when not editable", () => {
        renderPicker({ isEditable: false });

        expect(screen.getByRole("checkbox", { name: "Wi-Fi" })).toBeDisabled();
        expect(
            screen.queryByRole("button", { name: "Salvar comodidades" }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Criar comodidade" }),
        ).not.toBeInTheDocument();
    });
});
