import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    GET,
    POST,
} from "../../../../src/app/api/hotels/[id]/room-types/route.js";
import {
    ConflictError,
    NotFoundError,
    UnauthorizedError,
} from "../../../../src/lib/errors.js";
import {
    HOTEL_ID,
    createJsonRequest,
    createRouteContext,
} from "../../../helpers/http.js";

const { requireRole, listRoomTypes, createRoomType } = vi.hoisted(() => ({
    requireRole: vi.fn(),
    listRoomTypes: vi.fn(),
    createRoomType: vi.fn(),
}));

vi.mock("../../../../src/modules/auth/guards.js", () => ({ requireRole }));
vi.mock("../../../../src/services/room-type-service.js", () => ({
    roomTypeService: { listRoomTypes, createRoomType },
}));

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const URL = `http://localhost/api/hotels/${HOTEL_ID}/room-types`;

const VALID_BODY = Object.freeze({
    name: "Suíte Master",
    description: "Suíte com vista para o mar.",
    maxGuests: 3,
    areaM2: 42.5,
    defaultPrice: 350,
    beds: [{ bedType: "KING", quantity: 1 }],
});

describe("/api/hotels/:id/room-types", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireRole.mockResolvedValue(MANAGER);
        listRoomTypes.mockResolvedValue([{ id: "type-1" }]);
        createRoomType.mockResolvedValue({ id: "type-1" });
    });

    it("GET lists the room types for a manager or an admin", async () => {
        const response = await GET(new Request(URL), createRouteContext());

        expect(response.status).toBe(200);
        expect((await response.json()).data).toEqual([{ id: "type-1" }]);
        expect(requireRole).toHaveBeenCalledWith(["MANAGER", "ADMIN"]);
        expect(listRoomTypes).toHaveBeenCalledWith(MANAGER, HOTEL_ID);
    });

    it("POST creates the type with the money as a 2-place string and answers 201", async () => {
        const response = await POST(
            createJsonRequest(URL, "POST", VALID_BODY),
            createRouteContext(),
        );

        expect(response.status).toBe(201);
        expect(requireRole).toHaveBeenCalledWith(["MANAGER"]);
        expect(createRoomType).toHaveBeenCalledWith(
            MANAGER,
            HOTEL_ID,
            expect.objectContaining({
                areaM2: "42.50",
                defaultPrice: "350.00",
            }),
        );
    });

    it("POST answers 400 VALIDATION_ERROR for a price with 3 decimal places", async () => {
        const response = await POST(
            createJsonRequest(URL, "POST", {
                ...VALID_BODY,
                defaultPrice: "10.999",
            }),
            createRouteContext(),
        );

        expect(response.status).toBe(400);
        expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
        expect(createRoomType).not.toHaveBeenCalled();
    });

    it("answers 404, 409, 401 and 400 for a bad id", async () => {
        createRoomType.mockRejectedValueOnce(
            new NotFoundError("HOTEL_NOT_FOUND", "Hotel não encontrado."),
        );
        const notFound = await POST(
            createJsonRequest(URL, "POST", VALID_BODY),
            createRouteContext(),
        );
        createRoomType.mockRejectedValueOnce(
            new ConflictError("INVALID_HOTEL_STATUS", "Status inválido."),
        );
        const conflict = await POST(
            createJsonRequest(URL, "POST", VALID_BODY),
            createRouteContext(),
        );
        const invalidId = await GET(new Request(URL), createRouteContext("x"));
        requireRole.mockRejectedValue(new UnauthorizedError());
        const anonymous = await GET(new Request(URL), createRouteContext());

        expect(notFound.status).toBe(404);
        expect(conflict.status).toBe(409);
        expect(invalidId.status).toBe(400);
        expect(anonymous.status).toBe(401);
    });
});
