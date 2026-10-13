import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    DELETE,
    GET,
    PATCH,
} from "../../../../src/app/api/room-types/[id]/route.js";
import { ConflictError, NotFoundError } from "../../../../src/lib/errors.js";
import {
    HOTEL_ID as TYPE_ID,
    createJsonRequest,
    createRouteContext,
} from "../../../helpers/http.js";

const { requireRole, getRoomType, updateRoomType, deleteRoomType } = vi.hoisted(
    () => ({
        requireRole: vi.fn(),
        getRoomType: vi.fn(),
        updateRoomType: vi.fn(),
        deleteRoomType: vi.fn(),
    }),
);

vi.mock("../../../../src/modules/auth/guards.js", () => ({ requireRole }));
vi.mock("../../../../src/services/room-type-service.js", () => ({
    roomTypeService: { getRoomType, updateRoomType, deleteRoomType },
}));

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const URL = `http://localhost/api/room-types/${TYPE_ID}`;

describe("/api/room-types/:id", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireRole.mockResolvedValue(MANAGER);
        getRoomType.mockResolvedValue({ id: TYPE_ID });
        updateRoomType.mockResolvedValue({ id: TYPE_ID });
        deleteRoomType.mockResolvedValue({ id: TYPE_ID, outcome: "DELETED" });
    });

    it("GET returns the type for a manager or an admin", async () => {
        const response = await GET(new Request(URL), createRouteContext());

        expect(response.status).toBe(200);
        expect(requireRole).toHaveBeenCalledWith(["MANAGER", "ADMIN"]);
        expect(getRoomType).toHaveBeenCalledWith(MANAGER, TYPE_ID);
    });

    it("GET answers 404 ROOM_TYPE_NOT_FOUND", async () => {
        getRoomType.mockRejectedValue(
            new NotFoundError("ROOM_TYPE_NOT_FOUND", "Tipo não encontrado."),
        );

        const response = await GET(new Request(URL), createRouteContext());

        expect(response.status).toBe(404);
        expect((await response.json()).error.code).toBe("ROOM_TYPE_NOT_FOUND");
    });

    it("PATCH updates with the normalized price and requires a manager", async () => {
        const response = await PATCH(
            createJsonRequest(URL, "PATCH", { defaultPrice: 99.9 }),
            createRouteContext(),
        );

        expect(response.status).toBe(200);
        expect(requireRole).toHaveBeenCalledWith(["MANAGER"]);
        expect(updateRoomType).toHaveBeenCalledWith(MANAGER, TYPE_ID, {
            defaultPrice: "99.90",
        });
    });

    it("PATCH answers 400 for an empty body and for isActive true", async () => {
        const empty = await PATCH(
            createJsonRequest(URL, "PATCH", {}),
            createRouteContext(),
        );
        const reactivate = await PATCH(
            createJsonRequest(URL, "PATCH", { isActive: true }),
            createRouteContext(),
        );

        expect(empty.status).toBe(400);
        expect(reactivate.status).toBe(400);
        expect(updateRoomType).not.toHaveBeenCalled();
    });

    it("PATCH answers 409 ROOM_TYPE_INACTIVE", async () => {
        updateRoomType.mockRejectedValue(
            new ConflictError("ROOM_TYPE_INACTIVE", "Tipo desativado."),
        );

        const response = await PATCH(
            createJsonRequest(URL, "PATCH", { name: "Outro" }),
            createRouteContext(),
        );

        expect(response.status).toBe(409);
    });

    it("DELETE answers 200 with the outcome", async () => {
        const response = await DELETE(
            new Request(URL, { method: "DELETE" }),
            createRouteContext(),
        );

        expect(response.status).toBe(200);
        expect((await response.json()).data).toEqual({
            id: TYPE_ID,
            outcome: "DELETED",
        });
        expect(requireRole).toHaveBeenCalledWith(["MANAGER"]);
    });
});
