import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ApiError, apiFetch } from "../../../src/lib/api-client.js";
import { ERROR_CODES } from "../../../src/lib/errors.js";
import { RemoveRoomButton } from "../../../src/modules/rooms/components/remove-room-button.jsx";
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

const ROOM = Object.freeze({ id: "room-1", unitId: "unit-1", number: "101" });

function renderButton() {
    return renderWithUser(<RemoveRoomButton hotelId="hotel-1" room={ROOM} />);
}

async function confirmRemoval(user) {
    await user.click(screen.getByRole("button", { name: "Remover quarto" }));
    await user.click(screen.getByRole("button", { name: "Remover" }));
}

describe("RemoveRoomButton", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("explains the deletion and returns to the unit rooms", async () => {
        apiFetch.mockResolvedValue({ id: "room-1", outcome: "DELETED" });
        const { user } = renderButton();

        await confirmRemoval(user);

        await waitFor(() => {
            expect(apiFetch).toHaveBeenCalledWith("/api/rooms/room-1", {
                method: "DELETE",
            });
        });
        expect(toast.success).toHaveBeenCalledWith("Quarto excluído.");
        expect(router.push).toHaveBeenCalledWith(
            "/manager/hotels/hotel-1/rooms?unit=unit-1",
        );
    });

    it("explains the deactivation when the room has history", async () => {
        apiFetch.mockResolvedValue({ id: "room-1", outcome: "DEACTIVATED" });
        const { user } = renderButton();

        await confirmRemoval(user);

        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith(
                "O quarto tem histórico e foi desativado em vez de excluído; ele não pode ser reativado.",
            );
        });
        expect(router.push).not.toHaveBeenCalled();
        expect(router.refresh).toHaveBeenCalled();
    });

    it("asks for confirmation before removing", async () => {
        const { user } = renderButton();

        await user.click(
            screen.getByRole("button", { name: "Remover quarto" }),
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
        const { user } = renderButton();

        await confirmRemoval(user);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                "O hotel não pode ser editado.",
            );
        });
        expect(router.refresh).not.toHaveBeenCalled();
    });
});
