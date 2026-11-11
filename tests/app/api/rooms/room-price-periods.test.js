import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    GET,
    POST,
} from "../../../../src/app/api/rooms/[id]/price-periods/route.js";
import { ConflictError } from "../../../../src/lib/errors.js";
import {
    HOTEL_ID as ROOM_ID,
    createJsonRequest,
    createRouteContext,
} from "../../../helpers/http.js";

const { requireRole, listPricePeriods, createPricePeriod } = vi.hoisted(() => ({
    requireRole: vi.fn(),
    listPricePeriods: vi.fn(),
    createPricePeriod: vi.fn(),
}));

vi.mock("../../../../src/modules/auth/guards.js", () => ({ requireRole }));
vi.mock("../../../../src/services/room-price-period-service.js", () => ({
    roomPricePeriodService: { listPricePeriods, createPricePeriod },
}));

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const URL = `http://localhost/api/rooms/${ROOM_ID}/price-periods`;
const BODY = Object.freeze({
    startDate: "2026-12-20",
    endDate: "2026-12-31",
    price: "450",
});

describe("/api/rooms/:id/price-periods", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireRole.mockResolvedValue(MANAGER);
        listPricePeriods.mockResolvedValue([]);
        createPricePeriod.mockResolvedValue({ id: "period-1" });
    });

    it("GET lists the periods for a manager or an admin", async () => {
        const response = await GET(new Request(URL), createRouteContext());

        expect(response.status).toBe(200);
        expect(requireRole).toHaveBeenCalledWith(["MANAGER", "ADMIN"]);
        expect(listPricePeriods).toHaveBeenCalledWith(MANAGER, ROOM_ID);
    });

    it("POST creates the period with a normalized price and answers 201", async () => {
        const response = await POST(
            createJsonRequest(URL, "POST", BODY),
            createRouteContext(),
        );

        expect(response.status).toBe(201);
        expect(requireRole).toHaveBeenCalledWith(["MANAGER"]);
        expect(createPricePeriod).toHaveBeenCalledWith(MANAGER, ROOM_ID, {
            ...BODY,
            price: "450.00",
        });
    });

    it("POST answers 400 for reversed dates without calling the service", async () => {
        const response = await POST(
            createJsonRequest(URL, "POST", { ...BODY, endDate: "2026-12-19" }),
            createRouteContext(),
        );

        expect(response.status).toBe(400);
        expect(createPricePeriod).not.toHaveBeenCalled();
    });

    it("POST answers 409 PRICE_PERIOD_OVERLAP", async () => {
        createPricePeriod.mockRejectedValue(
            new ConflictError("PRICE_PERIOD_OVERLAP", "Sobreposição."),
        );

        const response = await POST(
            createJsonRequest(URL, "POST", BODY),
            createRouteContext(),
        );

        expect(response.status).toBe(409);
        expect((await response.json()).error.code).toBe("PRICE_PERIOD_OVERLAP");
    });
});
