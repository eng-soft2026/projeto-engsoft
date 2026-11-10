import { screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Button } from "../../src/components/ui/button.jsx";
import { FormField } from "../../src/components/ui/form-field.jsx";
import { Input } from "../../src/components/ui/input.jsx";
import { useApiForm } from "../../src/hooks/use-api-form.js";
import { ApiError, CLIENT_ERROR_CODES } from "../../src/lib/api-client.js";
import {
    DEFAULT_ERROR_MESSAGE,
    ERROR_MESSAGES,
} from "../../src/lib/error-messages.js";
import { ERROR_CODES } from "../../src/lib/errors.js";
import { renderWithUser } from "../helpers/render.jsx";

vi.mock("sonner", () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

const accountSchema = z.object({
    email: z.email("Informe um e-mail válido."),
    name: z.string().trim().min(1, "Informe o nome."),
});

function AccountForm(props) {
    const { form, onSubmit, formError, isSubmitting } = useApiForm({
        schema: accountSchema,
        defaultValues: { email: "", name: "" },
        ...props,
    });
    const { errors } = form.formState;

    return (
        <form onSubmit={onSubmit} noValidate>
            {formError && <p data-testid="form-error">{formError}</p>}
            <FormField label="E-mail" error={errors.email?.message}>
                <Input {...form.register("email")} />
            </FormField>
            <FormField label="Nome" error={errors.name?.message}>
                <Input {...form.register("name")} />
            </FormField>
            <Button type="submit" isLoading={isSubmitting}>
                Salvar
            </Button>
        </form>
    );
}

async function fillValidForm(user) {
    await user.type(screen.getByLabelText("E-mail"), "ana@example.com");
    await user.type(screen.getByLabelText("Nome"), " Ana ");
}

function createDeferred() {
    let resolve;
    const promise = new Promise((resolvePromise) => {
        resolve = resolvePromise;
    });
    return { promise, resolve };
}

describe("useApiForm", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("shows the Zod errors per field without calling the API", async () => {
        const submit = vi.fn();
        const { user } = renderWithUser(<AccountForm submit={submit} />);

        await user.type(screen.getByLabelText("E-mail"), "invalido");
        await user.click(screen.getByRole("button", { name: "Salvar" }));

        expect(
            await screen.findByText("Informe um e-mail válido."),
        ).toBeInTheDocument();
        expect(screen.getByText("Informe o nome.")).toBeInTheDocument();
        expect(screen.getByLabelText("E-mail")).toHaveAttribute(
            "aria-invalid",
            "true",
        );
        expect(submit).not.toHaveBeenCalled();
    });

    it("submits the parsed values and calls onSuccess with the data", async () => {
        const submit = vi.fn().mockResolvedValue({ id: "user-1" });
        const onSuccess = vi.fn();
        const { user } = renderWithUser(
            <AccountForm
                submit={submit}
                onSuccess={onSuccess}
                successMessage="Conta salva."
            />,
        );

        await fillValidForm(user);
        await user.click(screen.getByRole("button", { name: "Salvar" }));

        const values = { email: "ana@example.com", name: "Ana" };
        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalledWith({ id: "user-1" }, values);
        });
        expect(submit).toHaveBeenCalledWith(values);
        expect(toast.success).toHaveBeenCalledWith("Conta salva.");
        expect(toast.error).not.toHaveBeenCalled();
    });

    it("puts a mapped server error on its field", async () => {
        const submit = vi.fn().mockRejectedValue(
            new ApiError({
                code: ERROR_CODES.USER_ALREADY_EXISTS,
                message: "E-mail ou CPF já cadastrado.",
                status: 409,
            }),
        );
        const { user } = renderWithUser(
            <AccountForm
                submit={submit}
                fieldErrorCodes={{ USER_ALREADY_EXISTS: "email" }}
            />,
        );

        await fillValidForm(user);
        await user.click(screen.getByRole("button", { name: "Salvar" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "E-mail ou CPF já cadastrado.",
        );
        expect(screen.getByLabelText("E-mail")).toHaveFocus();
        expect(screen.queryByTestId("form-error")).not.toBeInTheDocument();
        expect(toast.error).not.toHaveBeenCalled();
    });

    it("shows an unmapped server error as a form error and a toast", async () => {
        const submit = vi.fn().mockRejectedValue(
            new ApiError({
                code: CLIENT_ERROR_CODES.NETWORK_ERROR,
                status: 0,
            }),
        );
        const onSuccess = vi.fn();
        const { user } = renderWithUser(
            <AccountForm
                submit={submit}
                onSuccess={onSuccess}
                fieldErrorCodes={{ USER_ALREADY_EXISTS: "email" }}
            />,
        );

        await fillValidForm(user);
        await user.click(screen.getByRole("button", { name: "Salvar" }));

        const message = ERROR_MESSAGES[CLIENT_ERROR_CODES.NETWORK_ERROR];
        expect(await screen.findByTestId("form-error")).toHaveTextContent(
            message,
        );
        expect(toast.error).toHaveBeenCalledWith(message);
        expect(onSuccess).not.toHaveBeenCalled();
    });

    it("hides the message of an error that did not come from the API", async () => {
        const submit = vi.fn().mockRejectedValue(new TypeError("boom"));
        const { user } = renderWithUser(
            <AccountForm
                submit={submit}
                fieldErrorCodes={{ TypeError: "email" }}
            />,
        );

        await fillValidForm(user);
        await user.click(screen.getByRole("button", { name: "Salvar" }));

        expect(await screen.findByTestId("form-error")).toHaveTextContent(
            DEFAULT_ERROR_MESSAGE,
        );
        expect(screen.queryByText("boom")).not.toBeInTheDocument();
    });

    it("clears the form error on the next submit", async () => {
        const submit = vi
            .fn()
            .mockRejectedValueOnce(
                new ApiError({
                    code: ERROR_CODES.FORBIDDEN,
                    message: "Acesso negado.",
                    status: 403,
                }),
            )
            .mockResolvedValueOnce(null);
        const { user } = renderWithUser(<AccountForm submit={submit} />);

        await fillValidForm(user);
        await user.click(screen.getByRole("button", { name: "Salvar" }));
        expect(await screen.findByTestId("form-error")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Salvar" }));

        await waitFor(() => {
            expect(screen.queryByTestId("form-error")).not.toBeInTheDocument();
        });
        expect(submit).toHaveBeenCalledTimes(2);
    });

    it("blocks a second submit while the first is pending", async () => {
        const deferred = createDeferred();
        const submit = vi.fn().mockReturnValue(deferred.promise);
        const { user } = renderWithUser(<AccountForm submit={submit} />);

        await fillValidForm(user);
        const form = screen
            .getByRole("button", { name: "Salvar" })
            .closest("form");
        form.requestSubmit();
        form.requestSubmit();

        await waitFor(() => {
            expect(submit).toHaveBeenCalledOnce();
        });
        await waitFor(() => {
            expect(
                screen.getByRole("button", { name: /Salvar/ }),
            ).toBeDisabled();
        });

        deferred.resolve(null);
        await waitFor(() => {
            expect(
                screen.getByRole("button", { name: /Salvar/ }),
            ).toBeEnabled();
        });
        expect(submit).toHaveBeenCalledOnce();
    });
});
