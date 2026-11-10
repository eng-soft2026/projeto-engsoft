import { screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "../../../src/lib/api-client.js";
import { ERROR_CODES } from "../../../src/lib/errors.js";
import { RegisterForm } from "../../../src/modules/auth/components/register-form.jsx";
import { buildUser } from "../../helpers/factories/index.js";
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

async function fillForm(user, account, passwordConfirmation) {
    await user.type(screen.getByLabelText(/^Nome/), account.name);
    await user.type(screen.getByLabelText(/^E-mail/), account.email);
    await user.type(screen.getByLabelText(/^CPF/), account.cpf);
    await user.type(screen.getByLabelText(/^Senha/), account.password);
    await user.type(
        screen.getByLabelText(/^Confirmar senha/),
        passwordConfirmation ?? account.password,
    );
}

function submit(user) {
    return user.click(screen.getByRole("button", { name: "Criar conta" }));
}

describe("RegisterForm", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("validates the password, the CPF and the confirmation on the client", async () => {
        const account = buildUser({ cpf: "111.111.111-11", password: "curta" });
        const { user } = renderWithUser(<RegisterForm />);

        await fillForm(user, account, "outra");
        await submit(user);

        expect(
            await screen.findByText(
                "A senha deve ter pelo menos 8 caracteres.",
            ),
        ).toBeInTheDocument();
        expect(screen.getByText("CPF inválido.")).toBeInTheDocument();
        expect(screen.getByText("As senhas não conferem.")).toBeInTheDocument();
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("requires a number in the password", async () => {
        const account = buildUser({ password: "somenteletras" });
        const { user } = renderWithUser(<RegisterForm />);

        await fillForm(user, account);
        await submit(user);

        expect(
            await screen.findByText(
                "A senha deve conter pelo menos um número.",
            ),
        ).toBeInTheDocument();
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("posts the account without the confirmation and goes to the login", async () => {
        apiFetch.mockResolvedValue({ id: "user-1" });
        const account = buildUser();
        const { user } = renderWithUser(
            <RegisterForm callbackUrl="/reservations" />,
        );

        await fillForm(user, account);
        await user.selectOptions(
            screen.getByLabelText(/^Tipo de conta/),
            "MANAGER",
        );
        await submit(user);

        await waitFor(() =>
            expect(router.push).toHaveBeenCalledWith(
                "/login?callbackUrl=%2Freservations",
            ),
        );
        expect(apiFetch).toHaveBeenCalledWith("/api/auth/register", {
            method: "POST",
            body: {
                name: account.name,
                email: account.email,
                cpf: account.cpf,
                password: account.password,
                role: "MANAGER",
            },
        });
        expect(toast.success).toHaveBeenCalledWith(
            "Conta criada. Entre para continuar.",
        );
    });

    it("sends CUSTOMER by default", async () => {
        apiFetch.mockResolvedValue({ id: "user-1" });
        const { user } = renderWithUser(<RegisterForm />);

        await fillForm(user, buildUser());
        await submit(user);

        await waitFor(() => expect(router.push).toHaveBeenCalledWith("/login"));
        expect(apiFetch.mock.calls[0][1].body.role).toBe("CUSTOMER");
    });

    it("shows an e-mail already registered on the e-mail field", async () => {
        apiFetch.mockRejectedValue(
            new ApiError({
                code: ERROR_CODES.USER_ALREADY_EXISTS,
                message: "Já existe uma conta com este e-mail ou CPF.",
                status: 409,
            }),
        );
        const { user } = renderWithUser(<RegisterForm />);

        await fillForm(user, buildUser());
        await submit(user);

        expect(
            await screen.findByText(
                "Já existe uma conta com este e-mail ou CPF.",
            ),
        ).toBeInTheDocument();
        expect(screen.getByLabelText(/^E-mail/)).toHaveAttribute(
            "aria-invalid",
            "true",
        );
        expect(screen.getByLabelText(/^E-mail/)).toHaveFocus();
        expect(router.push).not.toHaveBeenCalled();
    });

    it("shows any other error above the form", async () => {
        apiFetch.mockRejectedValue(
            new ApiError({ code: ERROR_CODES.INTERNAL_ERROR, status: 500 }),
        );
        const { user } = renderWithUser(<RegisterForm />);

        await fillForm(user, buildUser());
        await submit(user);

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Ocorreu um erro inesperado.",
        );
    });
});
