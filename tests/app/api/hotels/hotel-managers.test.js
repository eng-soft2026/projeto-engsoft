import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../../../src/app/api/hotels/[id]/managers/route.js";
import { DELETE } from "../../../../src/app/api/hotels/[id]/managers/[userId]/route.js";
import {
    ConflictError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
} from "../../../../src/lib/errors.js";
import {
    HOTEL_ID,
    createJsonRequest,
    createRouteContext,
} from "../../../helpers/http.js";

const { requireRole, addManager, removeManager } = vi.hoisted(() => ({
    requireRole: vi.fn(),
    addManager: vi.fn(),
    removeManager: vi.fn(),
}));

vi.mock("../../../../src/modules/auth/guards.js", () => ({ requireRole }));
vi.mock("../../../../src/services/hotel-manager-service.js", () => ({
    hotelManagerService: { addManager, removeManager },
}));

const OWNER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const USER_ID = "7a1c9f33-8b7d-4c6a-9e21-3f1c2a4e5d0b";
const URL = `http://localhost/api/hotels/${HOTEL_ID}/managers`;

function createDeleteContext(userId = USER_ID) {
    return { params: Promise.resolve({ id: HOTEL_ID, userId }) };
}

function createPostRequest(body) {
    return createJsonRequest(URL, "POST", body);
}

describe("POST /api/hotels/:id/managers (RF136)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireRole.mockResolvedValue(OWNER);
        addManager.mockResolvedValue({ id: USER_ID, name: "Gestor" });
    });

    it("adds the additional manager and answers 201", async () => {
        const response = await POST(
            createPostRequest({ email: " Gestor@Example.com " }),
            createRouteContext(),
        );

        expect(response.status).toBe(201);
        expect(await response.json()).toEqual({
            success: true,
            data: { id: USER_ID, name: "Gestor" },
        });
        expect(requireRole).toHaveBeenCalledWith(["MANAGER"]);
        expect(addManager).toHaveBeenCalledWith(OWNER, HOTEL_ID, {
            email: "gestor@example.com",
        });
    });

    it("answers 400 VALIDATION_ERROR for an invalid e-mail", async () => {
        const response = await POST(
            createPostRequest({ email: "not-an-email" }),
            createRouteContext(),
        );

        expect(response.status).toBe(400);
        expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
        expect(addManager).not.toHaveBeenCalled();
    });

    it("answers 400 for an invalid hotel id", async () => {
        const response = await POST(
            createPostRequest({ email: "a@example.com" }),
            createRouteContext("not-a-uuid"),
        );

        expect(response.status).toBe(400);
        expect(addManager).not.toHaveBeenCalled();
    });

    it("answers 401 without a session", async () => {
        requireRole.mockRejectedValue(new UnauthorizedError("Sem sessão."));

        const response = await POST(
            createPostRequest({ email: "a@example.com" }),
            createRouteContext(),
        );

        expect(response.status).toBe(401);
    });

    it("answers 403 to a user without the MANAGER role", async () => {
        requireRole.mockRejectedValue(new ForbiddenError("Sem permissão."));

        const response = await POST(
            createPostRequest({ email: "a@example.com" }),
            createRouteContext(),
        );

        expect(response.status).toBe(403);
        expect(addManager).not.toHaveBeenCalled();
    });

    it("answers 404 HOTEL_NOT_FOUND and 409 HOTEL_MANAGER_ALREADY_EXISTS from the service", async () => {
        addManager.mockRejectedValueOnce(
            new NotFoundError("HOTEL_NOT_FOUND", "Hotel não encontrado."),
        );
        const notFound = await POST(
            createPostRequest({ email: "a@example.com" }),
            createRouteContext(),
        );
        addManager.mockRejectedValueOnce(
            new ConflictError("HOTEL_MANAGER_ALREADY_EXISTS", "Já é gestor."),
        );
        const conflict = await POST(
            createPostRequest({ email: "a@example.com" }),
            createRouteContext(),
        );

        expect(notFound.status).toBe(404);
        expect(conflict.status).toBe(409);
        expect((await conflict.json()).error.code).toBe(
            "HOTEL_MANAGER_ALREADY_EXISTS",
        );
    });
});

describe("DELETE /api/hotels/:id/managers/:userId (RF136)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireRole.mockResolvedValue(OWNER);
        removeManager.mockResolvedValue(undefined);
    });

    it("removes the additional manager", async () => {
        const response = await DELETE(
            new Request(`${URL}/${USER_ID}`, { method: "DELETE" }),
            createDeleteContext(),
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            success: true,
            data: { removed: true },
        });
        expect(removeManager).toHaveBeenCalledWith(OWNER, HOTEL_ID, USER_ID);
    });

    it("answers 400 for an invalid user id", async () => {
        const response = await DELETE(
            new Request(`${URL}/x`, { method: "DELETE" }),
            createDeleteContext("x"),
        );

        expect(response.status).toBe(400);
        expect(removeManager).not.toHaveBeenCalled();
    });

    it("answers 404 HOTEL_MANAGER_NOT_FOUND from the service", async () => {
        removeManager.mockRejectedValue(
            new NotFoundError("HOTEL_MANAGER_NOT_FOUND", "Não encontrado."),
        );

        const response = await DELETE(
            new Request(`${URL}/${USER_ID}`, { method: "DELETE" }),
            createDeleteContext(),
        );

        expect(response.status).toBe(404);
        expect((await response.json()).error.code).toBe(
            "HOTEL_MANAGER_NOT_FOUND",
        );
    });

    it("answers 403 to a user without the MANAGER role", async () => {
        requireRole.mockRejectedValue(new ForbiddenError("Sem permissão."));

        const response = await DELETE(
            new Request(`${URL}/${USER_ID}`, { method: "DELETE" }),
            createDeleteContext(),
        );

        expect(response.status).toBe(403);
    });
});
