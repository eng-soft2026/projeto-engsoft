import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ApiError, apiFetch } from "../../../src/lib/api-client.js";
import { ERROR_CODES } from "../../../src/lib/errors.js";
import { HotelAcceptancesForm } from "../../../src/modules/hotels/components/hotel-acceptances-form.jsx";
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

const ACCEPTANCES = Object.freeze([
    { type: "PETS", customLabel: null, isAllowed: true, details: null },
]);

function renderForm({ isEditable = true, acceptances = ACCEPTANCES } = {}) {
    return renderWithUser(
        <HotelAcceptancesForm
            hotelId="hotel-1"
            isEditable={isEditable}
            acceptances={acceptances}
        />,
    );
}

function getGroup(name) {
    return screen.getByRole("group", { name });
}

async function addCustomRule(user, label) {
    await user.click(
        screen.getByRole("button", { name: "Adicionar regra própria" }),
    );
    const groups = screen.getAllByRole("group", { name: /^Regra própria/ });
    const group = groups.at(-1);
    await user.type(within(group).getByLabelText(/^Rótulo/), label);
    return group;
}

function submit(user) {
    return user.click(screen.getByRole("button", { name: "Salvar regras" }));
}

describe("HotelAcceptancesForm", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("shows one row per standard type with the stored values", () => {
        renderForm();

        expect(
            within(getGroup("Animais de estimação")).getByLabelText("Situação"),
        ).toHaveValue("ALLOWED");
        expect(
            within(getGroup("Fumar")).getByLabelText("Situação"),
        ).toHaveValue("");
    });

    it("sends the whole set in a single PUT", async () => {
        apiFetch.mockResolvedValue([]);
        const { user } = renderForm();

        await user.selectOptions(
            within(getGroup("Fumar")).getByLabelText("Situação"),
            "NOT_ALLOWED",
        );
        const group = await addCustomRule(user, "Som alto");
        await user.type(within(group).getByLabelText("Detalhes"), "Até 22h");
        await submit(user);

        await waitFor(() =>
            expect(apiFetch).toHaveBeenCalledWith(
                "/api/hotels/hotel-1/acceptances",
                {
                    method: "PUT",
                    body: {
                        acceptances: [
                            {
                                type: "PETS",
                                customLabel: null,
                                isAllowed: true,
                                details: null,
                            },
                            {
                                type: "SMOKING",
                                customLabel: null,
                                isAllowed: false,
                                details: null,
                            },
                            {
                                type: "OTHER",
                                customLabel: "Som alto",
                                isAllowed: true,
                                details: "Até 22h",
                            },
                        ],
                    },
                },
            ),
        );
        expect(toast.success).toHaveBeenCalledWith(
            "Regras de aceitação salvas.",
        );
        expect(router.refresh).toHaveBeenCalled();
    });

    it("refuses repeated custom labels ignoring case (RN113)", async () => {
        const { user } = renderForm();

        await addCustomRule(user, "Som alto");
        const duplicate = await addCustomRule(user, "SOM ALTO");
        await submit(user);

        expect(
            await within(duplicate).findByText(
                "Já existe uma regra com este rótulo.",
            ),
        ).toBeInTheDocument();
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("requires the label of a custom rule", async () => {
        const { user } = renderForm();

        await user.click(
            screen.getByRole("button", { name: "Adicionar regra própria" }),
        );
        await submit(user);

        expect(
            await screen.findByText("Informe o rótulo da regra."),
        ).toBeInTheDocument();
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("removes a custom rule from the set", async () => {
        apiFetch.mockResolvedValue([]);
        const { user } = renderForm({
            acceptances: [
                {
                    type: "OTHER",
                    customLabel: "Som alto",
                    isAllowed: false,
                    details: null,
                },
            ],
        });

        await user.click(
            screen.getByRole("button", { name: "Remover Regra própria 1" }),
        );
        await submit(user);

        await waitFor(() =>
            expect(apiFetch).toHaveBeenCalledWith(
                "/api/hotels/hotel-1/acceptances",
                { method: "PUT", body: { acceptances: [] } },
            ),
        );
    });

    it("shows the server error", async () => {
        apiFetch.mockRejectedValue(
            new ApiError({
                status: 409,
                code: ERROR_CODES.INVALID_HOTEL_STATUS,
                message: "Hotel fora de rascunho.",
            }),
        );
        const { user } = renderForm();

        await submit(user);

        await waitFor(() => expect(toast.error).toHaveBeenCalled());
        expect(router.refresh).not.toHaveBeenCalled();
    });

    it("is read-only outside draft", () => {
        renderForm({ isEditable: false });

        expect(
            within(getGroup("Animais de estimação")).getByLabelText("Situação"),
        ).toBeDisabled();
        expect(
            screen.queryByRole("button", { name: "Salvar regras" }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Adicionar regra própria" }),
        ).not.toBeInTheDocument();
    });
});
