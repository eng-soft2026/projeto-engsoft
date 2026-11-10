import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "../../../src/lib/api-client.js";
import { ERROR_CODES } from "../../../src/lib/errors.js";
import { ForgotPasswordForm } from "../../../src/modules/auth/components/forgot-password-form.jsx";
import { FORGOT_PASSWORD_SENT_MESSAGE } from "../../../src/modules/auth/password-reset-messages.js";
import { renderWithUser } from "../../helpers/render.jsx";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../../../src/lib/api-client.js", async (importOriginal) => ({
    ...(await importOriginal()),
    apiFetch: vi.fn(),
}));

async function submitEmail(user, email) {
    await user.type(screen.getByLabelText(/^E-mail/), email);
    await user.click(screen.getByRole("button", { name: "Enviar instruções" }));
}

async function renderSentMessage(email) {
    const { user, container, unmount } = renderWithUser(<ForgotPasswordForm />);
    await submitEmail(user, email);
    await screen.findByRole("status");
    const html = container.innerHTML;
    unmount();
    return html;
}

describe("ForgotPasswordForm", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("validates the e-mail on the client without calling the API", async () => {
        const { user } = renderWithUser(<ForgotPasswordForm />);

        await submitEmail(user, "nao-e-email");

        expect(screen.getByLabelText(/^E-mail/)).toHaveAttribute(
            "aria-invalid",
            "true",
        );
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("posts the normalized e-mail and replaces the form with the generic message", async () => {
        apiFetch.mockResolvedValue(null);
        const { user } = renderWithUser(<ForgotPasswordForm />);

        await submitEmail(user, "Ana@Example.com");

        expect(await screen.findByRole("status")).toHaveTextContent(
            FORGOT_PASSWORD_SENT_MESSAGE,
        );
        expect(
            screen.queryByRole("button", { name: "Enviar instruções" }),
        ).not.toBeInTheDocument();
        expect(apiFetch).toHaveBeenCalledWith("/api/auth/forgot-password", {
            method: "POST",
            body: { email: "ana@example.com" },
        });
    });

    it("renders the same screen whether the e-mail has an account or not", async () => {
        apiFetch.mockResolvedValue(null);

        const withAccount = await renderSentMessage("ana@example.com");
        const withoutAccount = await renderSentMessage("ninguem@example.com");

        expect(withoutAccount).toBe(withAccount);
        expect(withAccount).not.toContain("ana@example.com");
    });

    it("shows the wait time of a 429 answer and keeps the form", async () => {
        apiFetch.mockRejectedValue(
            new ApiError({
                code: ERROR_CODES.RATE_LIMITED,
                message: "Muitas solicitações.",
                status: 429,
                retryAfterSeconds: 900,
            }),
        );
        const { user } = renderWithUser(<ForgotPasswordForm />);

        await submitEmail(user, "ana@example.com");

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Muitas tentativas. Tente novamente em 15 minutos.",
        );
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("shows a network error and keeps the form", async () => {
        apiFetch.mockRejectedValue(
            new ApiError({
                code: "NETWORK_ERROR",
                message: "",
                status: 0,
            }),
        );
        const { user } = renderWithUser(<ForgotPasswordForm />);

        await submitEmail(user, "ana@example.com");

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Não foi possível conectar ao servidor.",
        );
        expect(
            screen.getByRole("button", { name: "Enviar instruções" }),
        ).toBeInTheDocument();
    });
});
