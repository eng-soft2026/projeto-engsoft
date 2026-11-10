import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "../../../src/lib/api-client.js";
import { ERROR_CODES } from "../../../src/lib/errors.js";
import { LoginForm } from "../../../src/modules/auth/components/login-form.jsx";
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

async function fillAndSubmit(user, { email, password }) {
    await user.type(screen.getByLabelText(/^E-mail/), email);
    await user.type(screen.getByLabelText(/^Senha/), password);
    await user.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("LoginForm", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("validates the fields on the client without calling the API", async () => {
        const { user } = renderWithUser(<LoginForm />);

        await user.click(screen.getByRole("button", { name: "Entrar" }));

        expect(await screen.findByText("Informe a senha.")).toBeInTheDocument();
        expect(screen.getByLabelText(/^E-mail/)).toHaveAttribute(
            "aria-invalid",
            "true",
        );
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("links to the password recovery", () => {
        renderWithUser(<LoginForm />);

        expect(
            screen.getByRole("link", { name: "Esqueci minha senha" }),
        ).toHaveAttribute("href", "/forgot-password");
    });

    it("posts the normalized credentials and goes to the callback URL", async () => {
        apiFetch.mockResolvedValue({ id: "user-1" });
        const { user } = renderWithUser(
            <LoginForm callbackUrl="/reservations?page=2" />,
        );

        await fillAndSubmit(user, {
            email: "Ana@Example.com",
            password: "senhaSegura1",
        });

        await waitFor(() =>
            expect(router.replace).toHaveBeenCalledWith("/reservations?page=2"),
        );
        expect(router.refresh).toHaveBeenCalled();
        expect(apiFetch).toHaveBeenCalledWith("/api/auth/login", {
            method: "POST",
            body: { email: "ana@example.com", password: "senhaSegura1" },
        });
    });

    it("goes to the home when the callback URL is unsafe", async () => {
        apiFetch.mockResolvedValue({ id: "user-1" });
        const { user } = renderWithUser(
            <LoginForm callbackUrl="//evil.example.com" />,
        );

        await fillAndSubmit(user, {
            email: "ana@example.com",
            password: "senhaSegura1",
        });

        await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    });

    it("shows INVALID_CREDENTIALS and stays on the page", async () => {
        apiFetch.mockRejectedValue(
            new ApiError({
                code: ERROR_CODES.INVALID_CREDENTIALS,
                message: "E-mail ou senha inválidos.",
                status: 401,
            }),
        );
        const { user } = renderWithUser(<LoginForm />);

        await fillAndSubmit(user, {
            email: "ana@example.com",
            password: "senhaErrada1",
        });

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "E-mail ou senha inválidos.",
        );
        expect(router.replace).not.toHaveBeenCalled();
    });

    it("shows the wait time of a 429 answer", async () => {
        apiFetch.mockRejectedValue(
            new ApiError({
                code: ERROR_CODES.RATE_LIMITED,
                message: "Muitas tentativas de login.",
                status: 429,
                retryAfterSeconds: 600,
            }),
        );
        const { user } = renderWithUser(<LoginForm />);

        await fillAndSubmit(user, {
            email: "ana@example.com",
            password: "senhaErrada1",
        });

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Muitas tentativas. Tente novamente em 10 minutos.",
        );
    });
});
