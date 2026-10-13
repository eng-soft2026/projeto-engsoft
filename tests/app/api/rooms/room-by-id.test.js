import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    DELETE,
    GET,
    PATCH,
} from "../../../../src/app/api/rooms/[id]/route.js";
import { ConflictError, NotFoundError } from "../../../../src/lib/errors.js";
import {
    HOTEL_ID as ROOM_ID,
    createJsonRequest,
    createRouteContext,
} from "../../../helpers/http.js";

const { requireRole, getRoom, updateRoom, deleteRoom } = vi.hoisted(() => ({
    requireRole: vi.fn(),
    getRoom: vi.fn(),
    updateRoom: vi.fn(),
    deleteRoom: vi.fn(),
}));

vi.mock("../../../../src/modules/auth/guards.js", () => ({ requireRole }));
vi.mock("../../../../src/services/room-service.js", () => ({
    roomService: { getRoom, updateRoom, deleteRoom },
}));

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const URL = `http://localhost/api/rooms/${ROOM_ID}`;

describe("/api/rooms/:id", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireRole.mockResolvedValue(MANAGER);
        getRoom.mockResolvedValue({ id: ROOM_ID });
        updateRoom.mockResolvedValue({ id: ROOM_ID });
        deleteRoom.mockResolvedValue({ id: ROOM_ID, outcome: "DEACTIVATED" });
    });

    it("GET returns the room and answers 404 ROOM_NOT_FOUND", async () => {
        const found = await GET(new Request(URL), createRouteContext());
        getRoom.mockRejectedValue(
            new NotFoundError("ROOM_NOT_FOUND", "Quarto não encontrado."),
        );
        const missing = await GET(new Request(URL), createRouteContext());

        expect(found.status).toBe(200);
        expect(missing.status).toBe(404);
        expect((await missing.json()).error.code).toBe("ROOM_NOT_FOUND");
    });

    it("PATCH sets the price, accepts null to remove it and requires a manager", async () => {
        await PATCH(
            createJsonRequest(URL, "PATCH", { price: "320" }),
            createRouteContext(),
        );
        await PATCH(
            createJsonRequest(URL, "PATCH", { price: null }),
            createRouteContext(),
        );

        expect(updateRoom).toHaveBeenNthCalledWith(1, MANAGER, ROOM_ID, {
            price: "320.00",
        });
        expect(updateRoom).toHaveBeenNthCalledWith(2, MANAGER, ROOM_ID, {
            price: null,
        });
        expect(requireRole).toHaveBeenCalledWith(["MANAGER"]);
    });

    it("PATCH answers 400 for BLOCKED, an empty body, isActive true and a 3-place price", async () => {
        for (const body of [
            { status: "BLOCKED" },
            {},
            { isActive: true },
            { price: "1.234" },
        ]) {
            const response = await PATCH(
                createJsonRequest(URL, "PATCH", body),
                createRouteContext(),
            );

            expect(response.status).toBe(400);
        }
        expect(updateRoom).not.toHaveBeenCalled();
    });

    it("PATCH answers 409 ROOM_INACTIVE", async () => {
        updateRoom.mockRejectedValue(
            new ConflictError("ROOM_INACTIVE", "Quarto desativado."),
        );

        const response = await PATCH(
            createJsonRequest(URL, "PATCH", { floor: 2 }),
            createRouteContext(),
        );

        expect(response.status).toBe(409);
    });

    it("DELETE answers 200 with the outcome (deleted or deactivated, RN011)", async () => {
        const response = await DELETE(
            new Request(URL, { method: "DELETE" }),
            createRouteContext(),
        );

        expect(response.status).toBe(200);
        expect((await response.json()).data).toEqual({
            id: ROOM_ID,
            outcome: "DEACTIVATED",
        });
        expect(deleteRoom).toHaveBeenCalledWith(MANAGER, ROOM_ID);
    });
});
