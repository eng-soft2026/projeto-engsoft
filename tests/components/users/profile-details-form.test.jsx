import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ApiError, apiFetch } from "../../../src/lib/api-client.js";
import { ERROR_CODES } from "../../../src/lib/errors.js";
import { ProfileDetailsForm } from "../../../src/modules/users/components/profile-details-form.jsx";
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

const USER = Object.freeze({ name: "Ana Souza", email: "ana@example.com" });

function renderForm() {
    return renderWithUser(<ProfileDetailsForm user={USER} />);
}

async function replaceField(user, label, value) {
    const field = screen.getByLabelText(label);
    await user.clear(field);
    await user.type(field, value);
}

function submit(user) {
    return user.click(screen.getByRole("button", { name: "Salvar dados" }));
}

describe("ProfileDetailsForm", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("starts with the current name and e-mail", () => {
        renderForm();

        expect(screen.getByLabelText(/^Nome/)).toHaveValue("Ana Souza");
        expect(screen.getByLabelText(/^E-mail/)).toHaveValue("ana@example.com");
    });

    it("validates the fields on the client without calling the API", async () => {
        const { user } = renderForm();

        await replaceField(user, /^Nome/, "A");
        await submit(user);

        expect(
            await screen.findByText("O nome deve ter pelo menos 2 caracteres."),
        ).toBeInTheDocument();
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("patches the normalized data and refreshes the page", async () => {
        apiFetch.mockResolvedValue({
            name: "Ana Maria Souza",
            email: "ana.maria@example.com",
        });
        const { user } = renderForm();

        await replaceField(user, /^Nome/, "Ana Maria Souza");
        await replaceField(user, /^E-mail/, "Ana.Maria@Example.com");
        await submit(user);

        await waitFor(() => expect(router.refresh).toHaveBeenCalled());
        expect(apiFetch).toHaveBeenCalledWith("/api/users/me", {
            method: "PATCH",
            body: { name: "Ana Maria Souza", email: "ana.maria@example.com" },
        });
        expect(toast.success).toHaveBeenCalledWith("Dados atualizados.");
        expect(screen.getByLabelText(/^E-mail/)).toHaveValue(
            "ana.maria@example.com",
        );
    });

    it("shows an e-mail already in use on the e-mail field", async () => {
        apiFetch.mockRejectedValue(
            new ApiError({
                code: ERROR_CODES.USER_ALREADY_EXISTS,
                message: "Já existe uma conta com este e-mail ou CPF.",
                status: 409,
            }),
        );
        const { user } = renderForm();

        await replaceField(user, /^E-mail/, "bia@example.com");
        await submit(user);

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Já existe uma conta com este e-mail ou CPF.",
        );
        expect(screen.getByLabelText(/^E-mail/)).toHaveAttribute(
            "aria-invalid",
            "true",
        );
        expect(router.refresh).not.toHaveBeenCalled();
    });
});
