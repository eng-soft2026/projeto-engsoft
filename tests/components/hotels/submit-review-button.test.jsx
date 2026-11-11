import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ApiError, apiFetch } from "../../../src/lib/api-client.js";
import { ERROR_CODES } from "../../../src/lib/errors.js";
import { SubmitReviewButton } from "../../../src/modules/hotels/components/submit-review-button.jsx";
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

const BUTTON_NAME = "Enviar para análise";

async function openDialog(user) {
    await user.click(screen.getByRole("button", { name: BUTTON_NAME }));
    return screen.getByRole("dialog", { name: "Enviar hotel para análise?" });
}

describe("SubmitReviewButton", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("asks for confirmation and cancels without calling the API", async () => {
        const { user } = renderWithUser(
            <SubmitReviewButton hotelId="hotel-1" />,
        );

        const dialog = await openDialog(user);
        await user.click(
            within(dialog).getByRole("button", { name: "Cancelar" }),
        );

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("submits the hotel for review after confirmation", async () => {
        apiFetch.mockResolvedValue({ id: "hotel-1" });
        const { user } = renderWithUser(
            <SubmitReviewButton hotelId="hotel-1" />,
        );

        const dialog = await openDialog(user);
        await user.click(
            within(dialog).getByRole("button", { name: BUTTON_NAME }),
        );

        await waitFor(() => expect(router.refresh).toHaveBeenCalled());
        expect(apiFetch).toHaveBeenCalledWith(
            "/api/hotels/hotel-1/submit-review",
            { method: "POST" },
        );
        expect(toast.success).toHaveBeenCalledWith(
            "Hotel enviado para análise.",
        );
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("shows the API error and keeps the dialog open", async () => {
        apiFetch.mockRejectedValue(
            new ApiError({
                status: 409,
                code: ERROR_CODES.INVALID_HOTEL_STATUS,
                message: "A ação não é permitida para o status atual do hotel.",
            }),
        );
        const { user } = renderWithUser(
            <SubmitReviewButton hotelId="hotel-1" />,
        );

        const dialog = await openDialog(user);
        await user.click(
            within(dialog).getByRole("button", { name: BUTTON_NAME }),
        );

        await waitFor(() => expect(toast.error).toHaveBeenCalled());
        expect(router.refresh).not.toHaveBeenCalled();
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
});
