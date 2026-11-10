import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ApiError, apiFetch } from "../../../src/lib/api-client.js";
import { ERROR_CODES } from "../../../src/lib/errors.js";
import { ResetPasswordForm } from "../../../src/modules/auth/components/reset-password-form.jsx";
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

const TOKEN = "token-de-recuperacao";

async function fillAndSubmit(user, { newPassword, confirmation }) {
    await user.type(screen.getByLabelText(/^Nova senha/), newPassword);
    await user.type(
        screen.getByLabelText(/^Confirmar nova senha/),
        confirmation,
    );
    await user.click(screen.getByRole("button", { name: "Redefinir senha" }));
}

describe("ResetPasswordForm", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("rejects a weak password on the client", async () => {
        const { user } = renderWithUser(<ResetPasswordForm token={TOKEN} />);

        await fillAndSubmit(user, {
            newPassword: "curta",
            confirmation: "curta",
        });

        expect(
            await screen.findByText(
                "A senha deve ter pelo menos 8 caracteres.",
            ),
        ).toBeInTheDocument();
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("rejects a different confirmation on its field", async () => {
        const { user } = renderWithUser(<ResetPasswordForm token={TOKEN} />);

        await fillAndSubmit(user, {
            newPassword: "novaSenha1",
            confirmation: "outraSenha1",
        });

        expect(
            await screen.findByText("As senhas não conferem."),
        ).toBeInTheDocument();
        expect(screen.getByLabelText(/^Confirmar nova senha/)).toHaveAttribute(
            "aria-invalid",
            "true",
        );
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("sends the token with the new password and goes to the login", async () => {
        apiFetch.mockResolvedValue(null);
        const { user } = renderWithUser(<ResetPasswordForm token={TOKEN} />);

        await fillAndSubmit(user, {
            newPassword: "novaSenha1",
            confirmation: "novaSenha1",
        });

        await waitFor(() =>
            expect(router.replace).toHaveBeenCalledWith("/login"),
        );
        expect(apiFetch).toHaveBeenCalledWith("/api/auth/reset-password", {
            method: "POST",
            body: { token: TOKEN, newPassword: "novaSenha1" },
        });
        expect(toast.success).toHaveBeenCalledWith(
            "Senha redefinida. Entre com a nova senha.",
        );
    });

    it("shows an invalid or expired token and stays on the page", async () => {
        apiFetch.mockRejectedValue(
            new ApiError({
                code: ERROR_CODES.INVALID_RESET_TOKEN,
                message:
                    "Link de recuperação inválido ou expirado. Solicite um novo.",
                status: 400,
            }),
        );
        const { user } = renderWithUser(<ResetPasswordForm token={TOKEN} />);

        await fillAndSubmit(user, {
            newPassword: "novaSenha1",
            confirmation: "novaSenha1",
        });

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Link de recuperação inválido ou expirado. Solicite um novo.",
        );
        expect(router.replace).not.toHaveBeenCalled();
    });
});
