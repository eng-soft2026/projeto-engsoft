import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ApiError, apiFetch } from "../../../src/lib/api-client.js";
import { ERROR_CODES } from "../../../src/lib/errors.js";
import { DeactivateRoomButton } from "../../../src/modules/rooms/components/deactivate-room-button.jsx";
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

const ROOM = Object.freeze({ id: "room-1", number: "101" });

describe("DeactivateRoomButton", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("deactivates the room after confirmation", async () => {
        apiFetch.mockResolvedValue({ id: "room-1", isActive: false });
        const { user } = renderWithUser(<DeactivateRoomButton room={ROOM} />);

        await user.click(
            screen.getByRole("button", { name: "Desativar quarto" }),
        );
        await user.click(screen.getByRole("button", { name: "Desativar" }));

        await waitFor(() => {
            expect(apiFetch).toHaveBeenCalledWith("/api/rooms/room-1", {
                method: "PATCH",
                body: { isActive: false },
            });
        });
        expect(toast.success).toHaveBeenCalledWith("Quarto desativado.");
        expect(router.refresh).toHaveBeenCalled();
    });

    it("does nothing when the manager cancels", async () => {
        const { user } = renderWithUser(<DeactivateRoomButton room={ROOM} />);

        await user.click(
            screen.getByRole("button", { name: "Desativar quarto" }),
        );
        await user.click(screen.getByRole("button", { name: "Cancelar" }));

        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("shows the server error", async () => {
        apiFetch.mockRejectedValue(
            new ApiError({
                status: 409,
                code: ERROR_CODES.ROOM_INACTIVE,
                message: "Este quarto está inativo.",
            }),
        );
        const { user } = renderWithUser(<DeactivateRoomButton room={ROOM} />);

        await user.click(
            screen.getByRole("button", { name: "Desativar quarto" }),
        );
        await user.click(screen.getByRole("button", { name: "Desativar" }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                "Este quarto está inativo.",
            );
        });
        expect(router.refresh).not.toHaveBeenCalled();
    });
});
