import { screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LogoutButton } from "../../../src/components/layout/logout-button.jsx";
import {
    ApiError,
    CLIENT_ERROR_CODES,
    apiFetch,
} from "../../../src/lib/api-client.js";
import { ERROR_MESSAGES } from "../../../src/lib/error-messages.js";
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

describe("LogoutButton", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("ends the session and goes to the home", async () => {
        apiFetch.mockResolvedValue(null);
        const onLoggedOut = vi.fn();
        const { user } = renderWithUser(
            <LogoutButton onLoggedOut={onLoggedOut} />,
        );

        await user.click(screen.getByRole("button", { name: "Sair" }));

        await waitFor(() => expect(router.push).toHaveBeenCalledWith("/"));
        expect(apiFetch).toHaveBeenCalledWith("/api/auth/logout", {
            method: "POST",
        });
        expect(router.refresh).toHaveBeenCalled();
        expect(onLoggedOut).toHaveBeenCalled();
    });

    it("shows the error and stays signed in when the request fails", async () => {
        apiFetch.mockRejectedValue(
            new ApiError({
                code: CLIENT_ERROR_CODES.NETWORK_ERROR,
                status: 0,
            }),
        );
        const { user } = renderWithUser(<LogoutButton />);

        await user.click(screen.getByRole("button", { name: "Sair" }));

        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith(
                ERROR_MESSAGES[CLIENT_ERROR_CODES.NETWORK_ERROR],
            ),
        );
        expect(router.push).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "Sair" })).toBeEnabled();
    });
});
