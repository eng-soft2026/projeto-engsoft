import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH } from "../../../../src/app/api/hotels/[id]/route.js";
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

const { requireRole, getHotel, updateHotel } = vi.hoisted(() => ({
    requireRole: vi.fn(),
    getHotel: vi.fn(),
    updateHotel: vi.fn(),
}));

vi.mock("../../../../src/modules/auth/guards.js", () => ({ requireRole }));
vi.mock("../../../../src/services/hotel-service.js", () => ({
    hotelService: { getHotel, updateHotel },
}));

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const ADMIN = Object.freeze({ id: "admin-1", role: "ADMIN" });

const HOTEL = Object.freeze({
    id: HOTEL_ID,
    ownerUserId: "manager-1",
    name: "Hotel Mar Azul",
    status: "DRAFT",
    reviewNotes: [],
});

const URL = `http://localhost/api/hotels/${HOTEL_ID}`;

function createGetRequest() {
    return new Request(URL);
}

function createPatchRequest(body) {
    return createJsonRequest(URL, "PATCH", body);
}

describe("/api/hotels/:id", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireRole.mockResolvedValue(MANAGER);
        getHotel.mockResolvedValue(HOTEL);
        updateHotel.mockImplementation(async (owner, id, changes) => ({
            ...HOTEL,
            ...changes,
        }));
    });

    describe("GET", () => {
        it("returns the hotel with its review notes", async () => {
            const response = await GET(
                createGetRequest(),
                createRouteContext(),
            );

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({
                success: true,
                data: HOTEL,
            });
            expect(getHotel).toHaveBeenCalledWith(MANAGER, HOTEL_ID);
        });

        it("accepts managers and administrators", async () => {
            await GET(createGetRequest(), createRouteContext());

            expect(requireRole).toHaveBeenCalledWith(["MANAGER", "ADMIN"]);
        });

        it("passes the administrator to the service, which allows global access", async () => {
            requireRole.mockResolvedValueOnce(ADMIN);

            await GET(createGetRequest(), createRouteContext());

            expect(getHotel).toHaveBeenCalledWith(ADMIN, HOTEL_ID);
        });

        it("returns 404 HOTEL_NOT_FOUND for the hotel of another manager", async () => {
            getHotel.mockRejectedValueOnce(
                new NotFoundError("HOTEL_NOT_FOUND", "Hotel não encontrado."),
            );

            const response = await GET(
                createGetRequest(),
                createRouteContext(),
            );

            expect(response.status).toBe(404);
            expect((await response.json()).error.code).toBe("HOTEL_NOT_FOUND");
        });

        it("returns 400 for an id that is not a UUID", async () => {
            const response = await GET(
                createGetRequest(),
                createRouteContext("hotel-1"),
            );

            expect(response.status).toBe(400);
            expect((await response.json()).error.message).toBe(
                "Identificador de hotel inválido.",
            );
            expect(getHotel).not.toHaveBeenCalled();
        });

        it("returns 401 without a session", async () => {
            requireRole.mockRejectedValueOnce(
                new UnauthorizedError("Faça login para continuar."),
            );

            const response = await GET(
                createGetRequest(),
                createRouteContext(),
            );

            expect(response.status).toBe(401);
            expect(getHotel).not.toHaveBeenCalled();
        });

        it("returns 403 for a customer", async () => {
            requireRole.mockRejectedValueOnce(
                new ForbiddenError("Sem acesso."),
            );

            const response = await GET(
                createGetRequest(),
                createRouteContext(),
            );

            expect(response.status).toBe(403);
            expect(getHotel).not.toHaveBeenCalled();
        });
    });

    describe("PATCH", () => {
        it("updates the hotel of the authenticated manager", async () => {
            const response = await PATCH(
                createPatchRequest({ name: "  Hotel Novo Nome  " }),
                createRouteContext(),
            );

            expect(response.status).toBe(200);
            expect((await response.json()).data.name).toBe("Hotel Novo Nome");
            expect(requireRole).toHaveBeenCalledWith(["MANAGER"]);
            expect(updateHotel).toHaveBeenCalledWith(MANAGER, HOTEL_ID, {
                name: "Hotel Novo Nome",
            });
        });

        it("normalizes a new CNPJ", async () => {
            await PATCH(
                createPatchRequest({ cnpj: "12.abc.345/01de-35" }),
                createRouteContext(),
            );

            expect(updateHotel).toHaveBeenCalledWith(MANAGER, HOTEL_ID, {
                cnpj: "12ABC34501DE35",
            });
        });

        it("ignores an attempt to change the status or the owner", async () => {
            await PATCH(
                createPatchRequest({
                    name: "Hotel Novo Nome",
                    status: "PUBLISHED",
                    ownerUserId: "someone-else",
                }),
                createRouteContext(),
            );

            expect(updateHotel).toHaveBeenCalledWith(MANAGER, HOTEL_ID, {
                name: "Hotel Novo Nome",
            });
        });

        it("does not accept an update that only tries to change the status", async () => {
            const response = await PATCH(
                createPatchRequest({ status: "PUBLISHED" }),
                createRouteContext(),
            );

            expect(response.status).toBe(400);
            expect(updateHotel).not.toHaveBeenCalled();
        });

        it("returns 400 INVALID_CNPJ for a wrong CNPJ", async () => {
            const response = await PATCH(
                createPatchRequest({ cnpj: "11.222.333/0001-82" }),
                createRouteContext(),
            );

            expect(response.status).toBe(400);
            expect((await response.json()).error.code).toBe("INVALID_CNPJ");
        });

        it("returns 409 INVALID_HOTEL_STATUS when the hotel is no longer a DRAFT", async () => {
            updateHotel.mockRejectedValueOnce(
                new ConflictError(
                    "INVALID_HOTEL_STATUS",
                    "A ação não é permitida para o status atual do hotel.",
                ),
            );

            const response = await PATCH(
                createPatchRequest({ name: "Outro nome" }),
                createRouteContext(),
            );

            expect(response.status).toBe(409);
            expect((await response.json()).error.code).toBe(
                "INVALID_HOTEL_STATUS",
            );
        });

        it("returns 404 HOTEL_NOT_FOUND for the hotel of another manager", async () => {
            updateHotel.mockRejectedValueOnce(
                new NotFoundError("HOTEL_NOT_FOUND", "Hotel não encontrado."),
            );

            const response = await PATCH(
                createPatchRequest({ name: "Invasor" }),
                createRouteContext(),
            );

            expect(response.status).toBe(404);
        });

        it("returns 400 for an id that is not a UUID", async () => {
            const response = await PATCH(
                createPatchRequest({ name: "Hotel" }),
                createRouteContext("../admin"),
            );

            expect(response.status).toBe(400);
            expect(updateHotel).not.toHaveBeenCalled();
        });

        it("returns 401 without a session and does not read the body", async () => {
            requireRole.mockRejectedValueOnce(
                new UnauthorizedError("Faça login para continuar."),
            );
            const request = new Request(URL, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: "{not json",
            });

            const response = await PATCH(request, createRouteContext());

            expect(response.status).toBe(401);
            expect(updateHotel).not.toHaveBeenCalled();
        });

        it("returns 403 for an administrator or a customer", async () => {
            requireRole.mockRejectedValueOnce(
                new ForbiddenError("Sem acesso."),
            );

            const response = await PATCH(
                createPatchRequest({ name: "Hotel" }),
                createRouteContext(),
            );

            expect(response.status).toBe(403);
            expect(updateHotel).not.toHaveBeenCalled();
        });
    });
});
