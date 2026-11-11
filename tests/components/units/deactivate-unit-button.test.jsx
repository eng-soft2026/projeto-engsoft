import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ApiError, apiFetch } from "../../../src/lib/api-client.js";
import { ERROR_CODES } from "../../../src/lib/errors.js";
import { DeactivateUnitButton } from "../../../src/modules/units/components/deactivate-unit-button.jsx";
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

const UNIT = Object.freeze({ id: "unit-1", name: "Unidade Centro" });

describe("DeactivateUnitButton", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("deactivates the unit after confirmation", async () => {
        apiFetch.mockResolvedValue({ ...UNIT, isActive: false });
        const { user } = renderWithUser(<DeactivateUnitButton unit={UNIT} />);

        await user.click(
            screen.getByRole("button", { name: "Desativar unidade" }),
        );
        await user.click(screen.getByRole("button", { name: "Desativar" }));

        await waitFor(() => {
            expect(apiFetch).toHaveBeenCalledWith("/api/units/unit-1", {
                method: "PATCH",
                body: { isActive: false },
            });
        });
        expect(toast.success).toHaveBeenCalledWith("Unidade desativada.");
        expect(router.refresh).toHaveBeenCalled();
    });

    it("does nothing when the manager cancels", async () => {
        const { user } = renderWithUser(<DeactivateUnitButton unit={UNIT} />);

        await user.click(
            screen.getByRole("button", { name: "Desativar unidade" }),
        );
        await user.click(screen.getByRole("button", { name: "Cancelar" }));

        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("shows the server error", async () => {
        apiFetch.mockRejectedValue(
            new ApiError({
                status: 409,
                code: ERROR_CODES.INVALID_HOTEL_STATUS,
                message: "O hotel não pode ser editado.",
            }),
        );
        const { user } = renderWithUser(<DeactivateUnitButton unit={UNIT} />);

        await user.click(
            screen.getByRole("button", { name: "Desativar unidade" }),
        );
        await user.click(screen.getByRole("button", { name: "Desativar" }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                "O hotel não pode ser editado.",
            );
        });
        expect(router.refresh).not.toHaveBeenCalled();
    });
});
