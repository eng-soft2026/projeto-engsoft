import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ApiError, apiFetch } from "../../../src/lib/api-client.js";
import { ERROR_CODES } from "../../../src/lib/errors.js";
import { ChangePasswordForm } from "../../../src/modules/users/components/change-password-form.jsx";
import { renderWithUser } from "../../helpers/render.jsx";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../../../src/lib/api-client.js", async (importOriginal) => ({
    ...(await importOriginal()),
    apiFetch: vi.fn(),
}));

async function fillAndSubmit(
    user,
    { currentPassword, newPassword, confirmation },
) {
    await user.type(screen.getByLabelText(/^Senha atual/), currentPassword);
    await user.type(screen.getByLabelText(/^Nova senha/), newPassword);
    await user.type(
        screen.getByLabelText(/^Confirmar nova senha/),
        confirmation,
    );
    await user.click(screen.getByRole("button", { name: "Alterar senha" }));
}

const VALID_CHANGE = Object.freeze({
    currentPassword: "senhaAtual1",
    newPassword: "novaSenha1",
    confirmation: "novaSenha1",
});

describe("ChangePasswordForm", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("rejects a different confirmation without calling the API", async () => {
        const { user } = renderWithUser(<ChangePasswordForm />);

        await fillAndSubmit(user, {
            ...VALID_CHANGE,
            confirmation: "outraSenha1",
        });

        expect(
            await screen.findByText("As senhas não conferem."),
        ).toBeInTheDocument();
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("sends only the current and the new password and clears the form", async () => {
        apiFetch.mockResolvedValue({ id: "user-1" });
        const { user } = renderWithUser(<ChangePasswordForm />);

        await fillAndSubmit(user, VALID_CHANGE);

        await waitFor(() =>
            expect(toast.success).toHaveBeenCalledWith("Senha alterada."),
        );
        expect(apiFetch).toHaveBeenCalledWith("/api/users/me", {
            method: "PATCH",
            body: { currentPassword: "senhaAtual1", newPassword: "novaSenha1" },
        });
        expect(screen.getByLabelText(/^Senha atual/)).toHaveValue("");
        expect(screen.getByLabelText(/^Nova senha/)).toHaveValue("");
        expect(screen.getByLabelText(/^Confirmar nova senha/)).toHaveValue("");
    });

    it("shows a wrong current password on its field", async () => {
        apiFetch.mockRejectedValue(
            new ApiError({
                code: ERROR_CODES.INVALID_CREDENTIALS,
                message: "Senha atual incorreta.",
                status: 401,
            }),
        );
        const { user } = renderWithUser(<ChangePasswordForm />);

        await fillAndSubmit(user, VALID_CHANGE);

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Senha atual incorreta.",
        );
        expect(screen.getByLabelText(/^Senha atual/)).toHaveAttribute(
            "aria-invalid",
            "true",
        );
        expect(toast.success).not.toHaveBeenCalled();
    });
});
