import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { HOTEL_STATUSES } from "../../../src/constants/hotel-statuses.js";
import { ApiError, apiFetch } from "../../../src/lib/api-client.js";
import { ERROR_CODES } from "../../../src/lib/errors.js";
import { AdminHotelActions } from "../../../src/modules/hotels/components/admin-hotel-actions.jsx";
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

const HOTEL_ID = "hotel-1";

function renderActions(status) {
    return renderWithUser(
        <AdminHotelActions hotelId={HOTEL_ID} status={status} />,
    );
}

async function openDialog(user, buttonName, dialogName) {
    await user.click(screen.getByRole("button", { name: buttonName }));
    return screen.getByRole("dialog", { name: dialogName });
}

describe("AdminHotelActions", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("shows approve, request changes and block for a hotel under review", () => {
        renderActions(HOTEL_STATUSES.UNDER_REVIEW);

        expect(
            screen.getAllByRole("button").map((button) => button.textContent),
        ).toEqual(["Aprovar", "Solicitar correções", "Bloquear"]);
    });

    it("shows only block for a published hotel", () => {
        renderActions(HOTEL_STATUSES.PUBLISHED);

        expect(
            screen.getAllByRole("button").map((button) => button.textContent),
        ).toEqual(["Bloquear"]);
    });

    it("renders nothing for a draft hotel", () => {
        const { container } = renderActions(HOTEL_STATUSES.DRAFT);

        expect(container).toBeEmptyDOMElement();
    });

    it("keeps the confirmation disabled until a reason is typed", async () => {
        const { user } = renderActions(HOTEL_STATUSES.UNDER_REVIEW);

        const dialog = await openDialog(
            user,
            "Aprovar",
            "Aprovar e publicar o hotel?",
        );
        const confirmButton = within(dialog).getByRole("button", {
            name: "Aprovar e publicar",
        });

        expect(confirmButton).toBeDisabled();
        await user.type(within(dialog).getByLabelText(/Motivo/), "   ");
        expect(confirmButton).toBeDisabled();
        await user.click(confirmButton);
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("approves the hotel with the reason and refreshes the page", async () => {
        apiFetch.mockResolvedValue({ id: HOTEL_ID });
        const { user } = renderActions(HOTEL_STATUSES.UNDER_REVIEW);

        const dialog = await openDialog(
            user,
            "Aprovar",
            "Aprovar e publicar o hotel?",
        );
        await user.type(
            within(dialog).getByLabelText(/Motivo/),
            "Cadastro completo",
        );
        await user.click(
            within(dialog).getByRole("button", { name: "Aprovar e publicar" }),
        );

        await waitFor(() => expect(router.refresh).toHaveBeenCalled());
        expect(apiFetch).toHaveBeenCalledWith(
            `/api/admin/hotels/${HOTEL_ID}/approve`,
            { method: "POST", body: { reason: "Cadastro completo" } },
        );
        expect(toast.success).toHaveBeenCalledWith(
            "Hotel aprovado e publicado.",
        );
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("requires the target status to unblock and sends it", async () => {
        apiFetch.mockResolvedValue({ id: HOTEL_ID });
        const { user } = renderActions(HOTEL_STATUSES.BLOCKED);

        const dialog = await openDialog(
            user,
            "Desbloquear",
            "Desbloquear o hotel?",
        );
        const confirmButton = within(dialog).getByRole("button", {
            name: "Desbloquear",
        });
        await user.type(
            within(dialog).getByLabelText(/Motivo/),
            "Fotos corrigidas",
        );

        expect(confirmButton).toBeDisabled();
        await user.selectOptions(
            within(dialog).getByLabelText(/Status de destino/),
            HOTEL_STATUSES.DRAFT,
        );
        expect(confirmButton).toBeEnabled();
        await user.click(confirmButton);

        await waitFor(() => expect(router.refresh).toHaveBeenCalled());
        expect(apiFetch).toHaveBeenCalledWith(
            `/api/admin/hotels/${HOTEL_ID}/unblock`,
            {
                method: "POST",
                body: {
                    reason: "Fotos corrigidas",
                    targetStatus: HOTEL_STATUSES.DRAFT,
                },
            },
        );
    });

    it("shows INVALID_HOTEL_STATUS and keeps the dialog open", async () => {
        apiFetch.mockRejectedValue(
            new ApiError({
                status: 409,
                code: ERROR_CODES.INVALID_HOTEL_STATUS,
                message: "A ação não é permitida para o status atual do hotel.",
            }),
        );
        const { user } = renderActions(HOTEL_STATUSES.PUBLISHED);

        const dialog = await openDialog(user, "Bloquear", "Bloquear o hotel?");
        await user.type(
            within(dialog).getByLabelText(/Motivo/),
            "Denúncias de clientes",
        );
        await user.click(
            within(dialog).getByRole("button", { name: "Bloquear hotel" }),
        );

        expect(
            await within(dialog).findByText(
                "A ação não é permitida para o status atual do hotel.",
            ),
        ).toBeInTheDocument();
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(router.refresh).not.toHaveBeenCalled();
        expect(toast.success).not.toHaveBeenCalled();
    });

    it("closes without calling the API when cancelled", async () => {
        const { user } = renderActions(HOTEL_STATUSES.UNDER_REVIEW);

        const dialog = await openDialog(
            user,
            "Solicitar correções",
            "Devolver o hotel para correções?",
        );
        await user.click(
            within(dialog).getByRole("button", { name: "Cancelar" }),
        );

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(apiFetch).not.toHaveBeenCalled();
    });
});
