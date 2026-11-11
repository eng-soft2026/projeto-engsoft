import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ApiError, apiFetch } from "../../../src/lib/api-client.js";
import { ERROR_CODES } from "../../../src/lib/errors.js";
import { RemoveRoomTypeButton } from "../../../src/modules/room-types/components/remove-room-type-button.jsx";
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

const ROOM_TYPE = Object.freeze({ id: "type-1", name: "Suíte Luxo" });

function renderButton() {
    return renderWithUser(
        <RemoveRoomTypeButton hotelId="hotel-1" roomType={ROOM_TYPE} />,
    );
}

async function confirmRemoval(user) {
    await user.click(screen.getByRole("button", { name: "Remover tipo" }));
    await user.click(screen.getByRole("button", { name: "Remover" }));
}

describe("RemoveRoomTypeButton", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("returns to the list when the room type is deleted", async () => {
        apiFetch.mockResolvedValue({ id: "type-1", outcome: "DELETED" });
        const { user } = renderButton();

        await confirmRemoval(user);

        await waitFor(() => {
            expect(apiFetch).toHaveBeenCalledWith("/api/room-types/type-1", {
                method: "DELETE",
            });
        });
        expect(toast.success).toHaveBeenCalledWith(
            "Tipo de acomodação excluído.",
        );
        expect(router.push).toHaveBeenCalledWith(
            "/manager/hotels/hotel-1/room-types",
        );
    });

    it("stays on the page when the room type is deactivated", async () => {
        apiFetch.mockResolvedValue({ id: "type-1", outcome: "DEACTIVATED" });
        const { user } = renderButton();

        await confirmRemoval(user);

        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith(
                "Tipo de acomodação desativado.",
            );
        });
        expect(router.push).not.toHaveBeenCalled();
        expect(router.refresh).toHaveBeenCalled();
    });

    it("does nothing when the manager cancels", async () => {
        const { user } = renderButton();

        await user.click(screen.getByRole("button", { name: "Remover tipo" }));
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
