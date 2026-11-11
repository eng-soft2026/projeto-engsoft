import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ApiError, apiFetch } from "../../../src/lib/api-client.js";
import { ERROR_CODES } from "../../../src/lib/errors.js";
import { RoomPricePeriodsPanel } from "../../../src/modules/rooms/components/room-price-periods-panel.jsx";
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

const TODAY = "2026-12-10";

const STARTED_PERIOD = Object.freeze({
    id: "period-1",
    roomId: "room-1",
    startDate: "2026-12-01",
    endDate: "2026-12-15",
    price: "300.00",
});

const FUTURE_PERIOD = Object.freeze({
    id: "period-2",
    roomId: "room-1",
    startDate: "2026-12-20",
    endDate: "2026-12-31",
    price: "480.50",
});

function renderPanel({
    isEditable = true,
    periods = [STARTED_PERIOD, FUTURE_PERIOD],
} = {}) {
    return renderWithUser(
        <RoomPricePeriodsPanel
            roomId="room-1"
            periods={periods}
            today={TODAY}
            isEditable={isEditable}
        />,
    );
}

async function fillPeriod(user, { startDate, endDate, price }) {
    await user.type(screen.getByLabelText(/^Data inicial/), startDate);
    await user.type(screen.getByLabelText(/^Data final/), endDate);
    await user.type(screen.getByLabelText(/^Preço por noite/), price);
}

describe("RoomPricePeriodsPanel", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("lists the periods with dates and prices", () => {
        renderPanel();

        expect(screen.getByText("01/12/2026 a 15/12/2026")).toBeInTheDocument();
        expect(screen.getByText("R$ 300,00 por noite")).toBeInTheDocument();
        expect(screen.getByText("20/12/2026 a 31/12/2026")).toBeInTheDocument();
        expect(screen.getByText("R$ 480,50 por noite")).toBeInTheDocument();
    });

    it("keeps a started period read only", () => {
        renderPanel();

        expect(screen.getByText("Iniciado")).toBeInTheDocument();
        expect(
            screen.queryByRole("button", {
                name: "Editar período 01/12/2026 a 15/12/2026",
            }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("button", {
                name: "Excluir período 01/12/2026 a 15/12/2026",
            }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole("button", {
                name: "Editar período 20/12/2026 a 31/12/2026",
            }),
        ).toBeInTheDocument();
    });

    it("shows an empty state without periods", () => {
        renderPanel({ periods: [] });

        expect(
            screen.getByText("Nenhum período cadastrado"),
        ).toBeInTheDocument();
    });

    it("hides every action when not editable", () => {
        renderPanel({ isEditable: false });

        expect(screen.queryByRole("button")).not.toBeInTheDocument();
        expect(screen.queryByText("Novo período")).not.toBeInTheDocument();
    });

    it("creates a period with the price as a two-decimal string", async () => {
        apiFetch.mockResolvedValue(FUTURE_PERIOD);
        const { user } = renderPanel({ periods: [] });

        await fillPeriod(user, {
            startDate: "2026-12-20",
            endDate: "2026-12-31",
            price: "480,5",
        });
        await user.click(screen.getByRole("button", { name: "Criar período" }));

        await waitFor(() =>
            expect(apiFetch).toHaveBeenCalledWith(
                "/api/rooms/room-1/price-periods",
                {
                    method: "POST",
                    body: {
                        startDate: "2026-12-20",
                        endDate: "2026-12-31",
                        price: "480.50",
                    },
                },
            ),
        );
        expect(toast.success).toHaveBeenCalledWith("Período criado.");
        expect(router.refresh).toHaveBeenCalled();
    });

    it("refuses an end date before the start date", async () => {
        const { user } = renderPanel({ periods: [] });

        await fillPeriod(user, {
            startDate: "2026-12-20",
            endDate: "2026-12-19",
            price: "100",
        });
        await user.click(screen.getByRole("button", { name: "Criar período" }));

        expect(
            await screen.findByText(
                "A data final deve ser igual ou posterior à inicial.",
            ),
        ).toBeInTheDocument();
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("refuses a start date before today", async () => {
        const { user } = renderPanel({ periods: [] });

        await fillPeriod(user, {
            startDate: "2026-12-09",
            endDate: "2026-12-20",
            price: "100",
        });
        await user.click(screen.getByRole("button", { name: "Criar período" }));

        expect(
            await screen.findByText(
                "A data inicial não pode ser anterior a hoje.",
            ),
        ).toBeInTheDocument();
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("highlights the start date when the period overlaps another", async () => {
        apiFetch.mockRejectedValue(
            new ApiError({
                status: 409,
                code: ERROR_CODES.PRICE_PERIOD_OVERLAP,
                message:
                    "Já existe um período de preço nessas datas para este quarto.",
            }),
        );
        const { user } = renderPanel({ periods: [] });

        await fillPeriod(user, {
            startDate: "2026-12-20",
            endDate: "2026-12-25",
            price: "200",
        });
        await user.click(screen.getByRole("button", { name: "Criar período" }));

        await waitFor(() =>
            expect(screen.getByLabelText(/^Data inicial/)).toHaveAttribute(
                "aria-invalid",
                "true",
            ),
        );
        expect(
            screen.getByText(
                "Já existe um período de preço nessas datas para este quarto.",
            ),
        ).toBeInTheDocument();
        expect(toast.error).not.toHaveBeenCalled();
    });

    it("updates a future period", async () => {
        apiFetch.mockResolvedValue(FUTURE_PERIOD);
        const { user } = renderPanel();

        await user.click(
            screen.getByRole("button", {
                name: "Editar período 20/12/2026 a 31/12/2026",
            }),
        );
        const priceInput = within(screen.getByRole("list")).getByLabelText(
            /^Preço por noite/,
        );
        expect(priceInput).toHaveValue("480,50");
        await user.clear(priceInput);
        await user.type(priceInput, "500");
        await user.click(
            screen.getByRole("button", { name: "Salvar período" }),
        );

        await waitFor(() =>
            expect(apiFetch).toHaveBeenCalledWith(
                "/api/price-periods/period-2",
                {
                    method: "PATCH",
                    body: {
                        startDate: "2026-12-20",
                        endDate: "2026-12-31",
                        price: "500.00",
                    },
                },
            ),
        );
        expect(toast.success).toHaveBeenCalledWith("Período atualizado.");
    });

    it("deletes a future period after confirmation", async () => {
        apiFetch.mockResolvedValue({ id: "period-2" });
        const { user } = renderPanel();

        await user.click(
            screen.getByRole("button", {
                name: "Excluir período 20/12/2026 a 31/12/2026",
            }),
        );
        const dialog = screen.getByRole("dialog");
        await user.click(
            within(dialog).getByRole("button", { name: "Excluir" }),
        );

        await waitFor(() =>
            expect(apiFetch).toHaveBeenCalledWith(
                "/api/price-periods/period-2",
                { method: "DELETE" },
            ),
        );
        expect(toast.success).toHaveBeenCalledWith("Período excluído.");
        expect(router.refresh).toHaveBeenCalled();
    });

    it("reports a refused deletion", async () => {
        apiFetch.mockRejectedValue(
            new ApiError({
                status: 409,
                code: ERROR_CODES.PRICE_PERIOD_PAST,
                message:
                    "Períodos já iniciados não podem ser alterados nem excluídos.",
            }),
        );
        const { user } = renderPanel();

        await user.click(
            screen.getByRole("button", {
                name: "Excluir período 20/12/2026 a 31/12/2026",
            }),
        );
        await user.click(
            within(screen.getByRole("dialog")).getByRole("button", {
                name: "Excluir",
            }),
        );

        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith(
                "Períodos já iniciados não podem ser alterados nem excluídos.",
            ),
        );
        expect(router.refresh).not.toHaveBeenCalled();
    });
});
