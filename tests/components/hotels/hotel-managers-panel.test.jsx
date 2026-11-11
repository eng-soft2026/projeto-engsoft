import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ApiError, apiFetch } from "../../../src/lib/api-client.js";
import { ERROR_CODES } from "../../../src/lib/errors.js";
import { HotelManagersPanel } from "../../../src/modules/hotels/components/hotel-managers-panel.jsx";
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

const OWNER = Object.freeze({
    id: "owner-1",
    name: "Ana Dona",
    email: "ana@exemplo.com",
});

const MANAGER = Object.freeze({
    id: "manager-2",
    name: "Bruno Gestor",
    email: "bruno@exemplo.com",
});

function renderPanel(managers = [MANAGER]) {
    return renderWithUser(
        <HotelManagersPanel
            hotelId="hotel-1"
            owner={OWNER}
            managers={managers}
        />,
    );
}

async function addManager(user, email) {
    await user.type(screen.getByLabelText(/^E-mail do gestor/), email);
    await user.click(screen.getByRole("button", { name: "Adicionar gestor" }));
}

function buildApiError(status, code, message) {
    return new ApiError({ status, code, message });
}

describe("HotelManagersPanel", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("lists the owner and the additional managers", () => {
        renderPanel();

        expect(screen.getByText("Ana Dona")).toBeInTheDocument();
        expect(screen.getByText("Proprietário")).toBeInTheDocument();
        expect(screen.getByText("bruno@exemplo.com")).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Remover Ana Dona" }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Remover Bruno Gestor" }),
        ).toBeInTheDocument();
    });

    it("shows an empty state without additional managers", () => {
        renderPanel([]);

        expect(screen.getByText("Nenhum gestor adicional")).toBeInTheDocument();
    });

    it("adds a manager by e-mail and refreshes the page", async () => {
        apiFetch.mockResolvedValue(MANAGER);
        const { user } = renderPanel([]);

        await addManager(user, "bruno@exemplo.com");

        await waitFor(() => expect(router.refresh).toHaveBeenCalled());
        expect(apiFetch).toHaveBeenCalledWith("/api/hotels/hotel-1/managers", {
            method: "POST",
            body: { email: "bruno@exemplo.com" },
        });
        expect(toast.success).toHaveBeenCalledWith("Gestor adicionado.");
        expect(screen.getByLabelText(/^E-mail do gestor/)).toHaveValue("");
    });

    it("validates the e-mail before calling the API", async () => {
        const { user } = renderPanel();

        await addManager(user, "invalido");

        expect(screen.getByLabelText(/^E-mail do gestor/)).toHaveAttribute(
            "aria-invalid",
            "true",
        );
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it.each([
        [404, ERROR_CODES.USER_NOT_FOUND, "Usuário não encontrado."],
        [
            409,
            ERROR_CODES.HOTEL_MANAGER_ALREADY_EXISTS,
            "Este usuário já é gestor do hotel.",
        ],
        [
            422,
            ERROR_CODES.VALIDATION_ERROR,
            "O usuário precisa ter o papel de gestor.",
        ],
    ])(
        "shows the %s %s error on the e-mail field",
        async (status, code, message) => {
            apiFetch.mockRejectedValue(buildApiError(status, code, message));
            const { user } = renderPanel();

            await addManager(user, "outro@exemplo.com");

            const field = screen.getByLabelText(/^E-mail do gestor/);
            await waitFor(() =>
                expect(field).toHaveAttribute("aria-invalid", "true"),
            );
            expect(router.refresh).not.toHaveBeenCalled();
        },
    );

    it("removes a manager after confirmation", async () => {
        apiFetch.mockResolvedValue({ removed: true });
        const { user } = renderPanel();

        await user.click(
            screen.getByRole("button", { name: "Remover Bruno Gestor" }),
        );
        const dialog = screen.getByRole("dialog", { name: "Remover gestor?" });
        await user.click(
            within(dialog).getByRole("button", { name: "Remover" }),
        );

        await waitFor(() => expect(router.refresh).toHaveBeenCalled());
        expect(apiFetch).toHaveBeenCalledWith(
            "/api/hotels/hotel-1/managers/manager-2",
            { method: "DELETE" },
        );
        expect(toast.success).toHaveBeenCalledWith("Gestor removido.");
    });

    it("keeps the dialog open when the removal fails", async () => {
        apiFetch.mockRejectedValue(
            buildApiError(
                404,
                ERROR_CODES.HOTEL_MANAGER_NOT_FOUND,
                "Gestor adicional não encontrado neste hotel.",
            ),
        );
        const { user } = renderPanel();

        await user.click(
            screen.getByRole("button", { name: "Remover Bruno Gestor" }),
        );
        const dialog = screen.getByRole("dialog", { name: "Remover gestor?" });
        await user.click(
            within(dialog).getByRole("button", { name: "Remover" }),
        );

        await waitFor(() => expect(toast.error).toHaveBeenCalled());
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(router.refresh).not.toHaveBeenCalled();
    });
});
