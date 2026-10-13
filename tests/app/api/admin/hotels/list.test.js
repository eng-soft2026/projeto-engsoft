import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../../../../../src/app/api/admin/hotels/route.js";
import {
    ForbiddenError,
    UnauthorizedError,
} from "../../../../../src/lib/errors.js";

const { requireRole, listHotelsForReview } = vi.hoisted(() => ({
    requireRole: vi.fn(),
    listHotelsForReview: vi.fn(),
}));

vi.mock("../../../../../src/modules/auth/guards.js", () => ({ requireRole }));
vi.mock("../../../../../src/services/hotel-service.js", () => ({
    hotelService: { listHotelsForReview },
}));

const ADMIN = Object.freeze({ id: "admin-1", role: "ADMIN" });

const HOTELS = Object.freeze([
    {
        id: "hotel-1",
        status: "UNDER_REVIEW",
        owner: { id: "manager-1", name: "Ana", email: "ana@example.com" },
    },
]);

function createGetRequest(query = "") {
    return new Request(`http://localhost/api/admin/hotels${query}`);
}

describe("GET /api/admin/hotels", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireRole.mockResolvedValue(ADMIN);
        listHotelsForReview.mockResolvedValue(HOTELS);
    });

    it("lists the hotels that wait for review, filtered by status", async () => {
        const response = await GET(createGetRequest("?status=UNDER_REVIEW"));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ success: true, data: HOTELS });
        expect(requireRole).toHaveBeenCalledWith(["ADMIN"]);
        expect(listHotelsForReview).toHaveBeenCalledWith(ADMIN, {
            status: "UNDER_REVIEW",
        });
    });

    it("lists every status without a filter", async () => {
        await GET(createGetRequest());

        expect(listHotelsForReview).toHaveBeenCalledWith(ADMIN, {});
    });

    it("ignores unknown query parameters", async () => {
        await GET(createGetRequest("?limit=100000&owner=manager-1"));

        expect(listHotelsForReview).toHaveBeenCalledWith(ADMIN, {});
    });

    it.each(["ARCHIVED", "", "draft"])(
        "returns 400 for the status %j",
        async (status) => {
            const response = await GET(createGetRequest(`?status=${status}`));

            expect(response.status).toBe(400);
            expect((await response.json()).error.message).toBe(
                "Status de hotel inválido.",
            );
            expect(listHotelsForReview).not.toHaveBeenCalled();
        },
    );

    it("returns 401 without a session", async () => {
        requireRole.mockRejectedValueOnce(
            new UnauthorizedError("Faça login para continuar."),
        );

        const response = await GET(createGetRequest());

        expect(response.status).toBe(401);
        expect(listHotelsForReview).not.toHaveBeenCalled();
    });

    it("returns 403 for a manager or a customer", async () => {
        requireRole.mockRejectedValueOnce(new ForbiddenError("Sem acesso."));

        const response = await GET(createGetRequest());

        expect(response.status).toBe(403);
        expect(listHotelsForReview).not.toHaveBeenCalled();
    });
});
