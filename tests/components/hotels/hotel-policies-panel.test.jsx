import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ApiError, apiFetch } from "../../../src/lib/api-client.js";
import { ERROR_CODES } from "../../../src/lib/errors.js";
import { HotelPoliciesPanel } from "../../../src/modules/hotels/components/hotel-policies-panel.jsx";
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

const OWN_POLICY = Object.freeze({
    id: "policy-1",
    type: "PARKING",
    title: "Estacionamento coberto",
    description: "Vagas para hóspedes.",
    isSystem: false,
    isActive: true,
});

const SYSTEM_POLICY = Object.freeze({
    id: "policy-2",
    type: "QUIET_HOURS",
    title: "Silêncio",
    description: "Das 22h às 7h.",
    isSystem: true,
    isActive: false,
});

function renderPanel({ isEditable = true, policies = [OWN_POLICY] } = {}) {
    return renderWithUser(
        <HotelPoliciesPanel
            hotelId="hotel-1"
            isEditable={isEditable}
            policies={policies}
        />,
    );
}

describe("HotelPoliciesPanel", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("lists the policies with their badges", () => {
        renderPanel({ policies: [OWN_POLICY, SYSTEM_POLICY] });

        expect(screen.getByText("Estacionamento coberto")).toBeInTheDocument();
        expect(screen.getByText("Padrão")).toBeInTheDocument();
        expect(screen.getByText("Inativa")).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Editar Silêncio" }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Reativar Silêncio" }),
        ).toBeInTheDocument();
    });

    it("shows an empty state without policies", () => {
        renderPanel({ policies: [] });

        expect(
            screen.getByText("Nenhuma política cadastrada"),
        ).toBeInTheDocument();
    });

    it("creates a policy", async () => {
        apiFetch.mockResolvedValue(OWN_POLICY);
        const { user } = renderPanel({ policies: [] });

        await user.selectOptions(screen.getByLabelText(/^Tipo/), "PARKING");
        await user.type(screen.getByLabelText(/^Título/), "Garagem");
        await user.type(screen.getByLabelText(/^Descrição/), "Vagas cobertas.");
        await user.click(
            screen.getByRole("button", { name: "Criar política" }),
        );

        await waitFor(() =>
            expect(apiFetch).toHaveBeenCalledWith(
                "/api/hotels/hotel-1/policies",
                {
                    method: "POST",
                    body: {
                        type: "PARKING",
                        title: "Garagem",
                        description: "Vagas cobertas.",
                    },
                },
            ),
        );
        expect(toast.success).toHaveBeenCalledWith("Política criada.");
        expect(router.refresh).toHaveBeenCalled();
    });

    it("validates the policy fields on the client", async () => {
        const { user } = renderPanel({ policies: [] });

        await user.click(
            screen.getByRole("button", { name: "Criar política" }),
        );

        expect(
            await screen.findByText(
                "O título deve ter pelo menos 2 caracteres.",
            ),
        ).toBeInTheDocument();
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("warns that a cancellation text does not change refunds (RN114)", async () => {
        const { user } = renderPanel({ policies: [] });

        await user.selectOptions(
            screen.getByLabelText(/^Tipo/),
            "CANCELLATION",
        );

        expect(
            screen.getByText(/prazos e reembolsos seguem a política/),
        ).toBeInTheDocument();
    });

    it("edits an own policy", async () => {
        apiFetch.mockResolvedValue(OWN_POLICY);
        const { user } = renderPanel();

        await user.click(
            screen.getByRole("button", {
                name: "Editar Estacionamento coberto",
            }),
        );
        const title = screen.getByDisplayValue("Estacionamento coberto");
        await user.clear(title);
        await user.type(title, "Garagem");
        await user.click(
            screen.getByRole("button", { name: "Salvar política" }),
        );

        await waitFor(() =>
            expect(apiFetch).toHaveBeenCalledWith("/api/policies/policy-1", {
                method: "PATCH",
                body: {
                    type: "PARKING",
                    title: "Garagem",
                    description: "Vagas para hóspedes.",
                },
            }),
        );
        expect(toast.success).toHaveBeenCalledWith("Política atualizada.");
    });

    it("deactivates a policy after confirmation", async () => {
        apiFetch.mockResolvedValue({ ...OWN_POLICY, isActive: false });
        const { user } = renderPanel();

        await user.click(
            screen.getByRole("button", {
                name: "Desativar Estacionamento coberto",
            }),
        );
        await user.click(screen.getByRole("button", { name: "Desativar" }));

        await waitFor(() =>
            expect(apiFetch).toHaveBeenCalledWith("/api/policies/policy-1", {
                method: "PATCH",
                body: { isActive: false },
            }),
        );
        expect(toast.success).toHaveBeenCalledWith("Política desativada.");
        expect(router.refresh).toHaveBeenCalled();
    });

    it("shows the server error when the toggle fails", async () => {
        apiFetch.mockRejectedValue(
            new ApiError({
                status: 409,
                code: ERROR_CODES.INVALID_HOTEL_STATUS,
                message: "Hotel fora de rascunho.",
            }),
        );
        const { user } = renderPanel();

        await user.click(
            screen.getByRole("button", {
                name: "Desativar Estacionamento coberto",
            }),
        );
        await user.click(screen.getByRole("button", { name: "Desativar" }));

        await waitFor(() => expect(toast.error).toHaveBeenCalled());
        expect(router.refresh).not.toHaveBeenCalled();
    });

    it("hides every action outside draft", () => {
        renderPanel({ isEditable: false });

        expect(screen.queryByRole("button")).not.toBeInTheDocument();
        expect(screen.queryByText("Nova política")).not.toBeInTheDocument();
    });
});
