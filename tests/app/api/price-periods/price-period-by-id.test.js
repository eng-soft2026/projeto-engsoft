import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    DELETE,
    PATCH,
} from "../../../../src/app/api/price-periods/[id]/route.js";
import { ConflictError } from "../../../../src/lib/errors.js";
import {
    HOTEL_ID as PERIOD_ID,
    createJsonRequest,
    createRouteContext,
} from "../../../helpers/http.js";

const { requireRole, updatePricePeriod, deletePricePeriod } = vi.hoisted(
    () => ({
        requireRole: vi.fn(),
        updatePricePeriod: vi.fn(),
        deletePricePeriod: vi.fn(),
    }),
);

vi.mock("../../../../src/modules/auth/guards.js", () => ({ requireRole }));
vi.mock("../../../../src/services/room-price-period-service.js", () => ({
    roomPricePeriodService: { updatePricePeriod, deletePricePeriod },
}));

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const URL = `http://localhost/api/price-periods/${PERIOD_ID}`;

describe("/api/price-periods/:id", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireRole.mockResolvedValue(MANAGER);
        updatePricePeriod.mockResolvedValue({ id: PERIOD_ID });
        deletePricePeriod.mockResolvedValue({ id: PERIOD_ID });
    });

    it("PATCH passes the parsed changes and requires a manager", async () => {
        const response = await PATCH(
            createJsonRequest(URL, "PATCH", { price: 480 }),
            createRouteContext(),
        );

        expect(response.status).toBe(200);
        expect(requireRole).toHaveBeenCalledWith(["MANAGER"]);
        expect(updatePricePeriod).toHaveBeenCalledWith(MANAGER, PERIOD_ID, {
            price: "480.00",
        });
    });

    it("PATCH answers 400 for an empty body", async () => {
        const response = await PATCH(
            createJsonRequest(URL, "PATCH", {}),
            createRouteContext(),
        );

        expect(response.status).toBe(400);
        expect(updatePricePeriod).not.toHaveBeenCalled();
    });

    it("DELETE removes the period and answers 409 PRICE_PERIOD_PAST for a started one", async () => {
        const removed = await DELETE(new Request(URL), createRouteContext());
        deletePricePeriod.mockRejectedValue(
            new ConflictError("PRICE_PERIOD_PAST", "Período iniciado."),
        );
        const refused = await DELETE(new Request(URL), createRouteContext());

        expect(removed.status).toBe(200);
        expect(refused.status).toBe(409);
        expect((await refused.json()).error.code).toBe("PRICE_PERIOD_PAST");
    });
});
