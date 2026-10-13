import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../../../src/app/api/hotels/[id]/submit-review/route.js";
import {
    ConflictError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
} from "../../../../src/lib/errors.js";
import { HOTEL_ID, createRouteContext } from "../../../helpers/http.js";

const { requireRole, submitForReview } = vi.hoisted(() => ({
    requireRole: vi.fn(),
    submitForReview: vi.fn(),
}));

vi.mock("../../../../src/modules/auth/guards.js", () => ({ requireRole }));
vi.mock("../../../../src/services/hotel-service.js", () => ({
    hotelService: { submitForReview },
}));

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });

function createPostRequest() {
    return new Request(
        `http://localhost/api/hotels/${HOTEL_ID}/submit-review`,
        { method: "POST" },
    );
}

describe("POST /api/hotels/:id/submit-review (RF009)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireRole.mockResolvedValue(MANAGER);
        submitForReview.mockResolvedValue({
            id: HOTEL_ID,
            status: "UNDER_REVIEW",
        });
    });

    it("sends the hotel of the authenticated manager to review", async () => {
        const response = await POST(createPostRequest(), createRouteContext());

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            success: true,
            data: { id: HOTEL_ID, status: "UNDER_REVIEW" },
        });
        expect(requireRole).toHaveBeenCalledWith(["MANAGER"]);
        expect(submitForReview).toHaveBeenCalledWith(MANAGER, HOTEL_ID);
    });

    it("returns 409 INVALID_HOTEL_STATUS when the hotel is not a DRAFT", async () => {
        submitForReview.mockRejectedValueOnce(
            new ConflictError(
                "INVALID_HOTEL_STATUS",
                "A ação não é permitida para o status atual do hotel.",
            ),
        );

        const response = await POST(createPostRequest(), createRouteContext());

        expect(response.status).toBe(409);
        expect((await response.json()).error.code).toBe("INVALID_HOTEL_STATUS");
    });

    it("returns 404 HOTEL_NOT_FOUND for the hotel of another manager", async () => {
        submitForReview.mockRejectedValueOnce(
            new NotFoundError("HOTEL_NOT_FOUND", "Hotel não encontrado."),
        );

        const response = await POST(createPostRequest(), createRouteContext());

        expect(response.status).toBe(404);
        expect((await response.json()).error.code).toBe("HOTEL_NOT_FOUND");
    });

    it("returns 400 for an id that is not a UUID", async () => {
        const response = await POST(
            createPostRequest(),
            createRouteContext("hotel-1"),
        );

        expect(response.status).toBe(400);
        expect(submitForReview).not.toHaveBeenCalled();
    });

    it("returns 401 without a session", async () => {
        requireRole.mockRejectedValueOnce(
            new UnauthorizedError("Faça login para continuar."),
        );

        const response = await POST(createPostRequest(), createRouteContext());

        expect(response.status).toBe(401);
        expect(submitForReview).not.toHaveBeenCalled();
    });

    it("returns 403 for an administrator or a customer", async () => {
        requireRole.mockRejectedValueOnce(new ForbiddenError("Sem acesso."));

        const response = await POST(createPostRequest(), createRouteContext());

        expect(response.status).toBe(403);
        expect(submitForReview).not.toHaveBeenCalled();
    });
});
