import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../../../../src/app/api/units/[id]/rooms/route.js";
import {
    ConflictError,
    ForbiddenError,
    NotFoundError,
} from "../../../../src/lib/errors.js";
import {
    HOTEL_ID as UNIT_ID,
    createJsonRequest,
    createRouteContext,
} from "../../../helpers/http.js";

const { requireRole, listRooms, createRoom } = vi.hoisted(() => ({
    requireRole: vi.fn(),
    listRooms: vi.fn(),
    createRoom: vi.fn(),
}));

vi.mock("../../../../src/modules/auth/guards.js", () => ({ requireRole }));
vi.mock("../../../../src/services/room-service.js", () => ({
    roomService: { listRooms, createRoom },
}));

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const URL = `http://localhost/api/units/${UNIT_ID}/rooms`;
const TYPE_ID = "a1b2c3d4-8b7d-4c6a-9e21-3f1c2a4e0003";

const VALID_BODY = Object.freeze({
    roomTypeId: TYPE_ID,
    number: "101",
    floor: 1,
    price: 299.9,
});

describe("/api/units/:id/rooms", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireRole.mockResolvedValue(MANAGER);
        listRooms.mockResolvedValue([{ id: "room-1" }]);
        createRoom.mockResolvedValue({ id: "room-1" });
    });

    it("GET lists the rooms of the unit", async () => {
        const response = await GET(new Request(URL), createRouteContext());

        expect(response.status).toBe(200);
        expect(listRooms).toHaveBeenCalledWith(MANAGER, UNIT_ID);
        expect(requireRole).toHaveBeenCalledWith(["MANAGER", "ADMIN"]);
    });

    it("POST creates the room with the defaults and a 2-place price, answering 201", async () => {
        const response = await POST(
            createJsonRequest(URL, "POST", VALID_BODY),
            createRouteContext(),
        );

        expect(response.status).toBe(201);
        expect(createRoom).toHaveBeenCalledWith(MANAGER, UNIT_ID, {
            roomTypeId: TYPE_ID,
            number: "101",
            floor: 1,
            isAccessible: false,
            status: "AVAILABLE",
            price: "299.90",
        });
    });

    it("POST answers 400 for a status that only the system sets", async () => {
        const response = await POST(
            createJsonRequest(URL, "POST", {
                ...VALID_BODY,
                status: "BLOCKED",
            }),
            createRouteContext(),
        );

        expect(response.status).toBe(400);
        expect(createRoom).not.toHaveBeenCalled();
    });

    it("POST answers 403 for a customer", async () => {
        requireRole.mockRejectedValue(new ForbiddenError("Sem permissão."));

        const response = await POST(
            createJsonRequest(URL, "POST", VALID_BODY),
            createRouteContext(),
        );

        expect(response.status).toBe(403);
    });

    it("POST answers 404 ROOM_TYPE_NOT_FOUND and 409 ROOM_NUMBER_ALREADY_EXISTS", async () => {
        createRoom.mockRejectedValueOnce(
            new NotFoundError("ROOM_TYPE_NOT_FOUND", "Tipo não encontrado."),
        );
        const notFound = await POST(
            createJsonRequest(URL, "POST", VALID_BODY),
            createRouteContext(),
        );
        createRoom.mockRejectedValueOnce(
            new ConflictError("ROOM_NUMBER_ALREADY_EXISTS", "Número em uso."),
        );
        const conflict = await POST(
            createJsonRequest(URL, "POST", VALID_BODY),
            createRouteContext(),
        );

        expect(notFound.status).toBe(404);
        expect(conflict.status).toBe(409);
        expect((await conflict.json()).error.code).toBe(
            "ROOM_NUMBER_ALREADY_EXISTS",
        );
    });
});
