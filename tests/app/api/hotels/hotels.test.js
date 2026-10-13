import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../../../../src/app/api/hotels/route.js";
import {
    ForbiddenError,
    UnauthorizedError,
} from "../../../../src/lib/errors.js";
import { createJsonRequest } from "../../../helpers/http.js";

const { requireRole, listOwnHotels, createHotel } = vi.hoisted(() => ({
    requireRole: vi.fn(),
    listOwnHotels: vi.fn(),
    createHotel: vi.fn(),
}));

vi.mock("../../../../src/modules/auth/guards.js", () => ({ requireRole }));
vi.mock("../../../../src/services/hotel-service.js", () => ({
    hotelService: { listOwnHotels, createHotel },
}));

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });

const HOTEL_BODY = Object.freeze({
    name: "Hotel Mar Azul",
    description: "Hotel à beira-mar com café da manhã incluso.",
    category: "4 estrelas",
    cnpj: "11.222.333/0001-81",
    email: "contato@marazul.example.com",
});

function createPostRequest(body) {
    return createJsonRequest("http://localhost/api/hotels", "POST", body);
}

describe("/api/hotels", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireRole.mockResolvedValue(MANAGER);
        listOwnHotels.mockResolvedValue([{ id: "hotel-1", status: "DRAFT" }]);
        createHotel.mockImplementation(async (owner, input) => ({
            id: "hotel-1",
            ownerUserId: owner.id,
            ...input,
            status: "DRAFT",
        }));
    });

    describe("GET", () => {
        it("lists the hotels of the authenticated manager", async () => {
            const response = await GET();

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({
                success: true,
                data: [{ id: "hotel-1", status: "DRAFT" }],
            });
            expect(requireRole).toHaveBeenCalledWith(["MANAGER"]);
            expect(listOwnHotels).toHaveBeenCalledWith(MANAGER);
        });

        it("returns 401 UNAUTHORIZED without a session", async () => {
            requireRole.mockRejectedValueOnce(
                new UnauthorizedError("Faça login para continuar."),
            );

            const response = await GET();

            expect(response.status).toBe(401);
            expect((await response.json()).error.code).toBe("UNAUTHORIZED");
            expect(listOwnHotels).not.toHaveBeenCalled();
        });

        it("returns 403 FORBIDDEN for a user that is not a manager", async () => {
            requireRole.mockRejectedValueOnce(
                new ForbiddenError("Sem acesso."),
            );

            const response = await GET();

            expect(response.status).toBe(403);
            expect((await response.json()).error.code).toBe("FORBIDDEN");
            expect(listOwnHotels).not.toHaveBeenCalled();
        });
    });

    describe("POST", () => {
        it("creates the hotel and answers 201 with the new hotel (RF007, RF008)", async () => {
            const response = await POST(createPostRequest(HOTEL_BODY));

            expect(response.status).toBe(201);
            const { success, data } = await response.json();
            expect(success).toBe(true);
            expect(data).toMatchObject({
                ownerUserId: "manager-1",
                status: "DRAFT",
            });
            expect(requireRole).toHaveBeenCalledWith(["MANAGER"]);
        });

        it("hands the validated and normalized input to the service", async () => {
            await POST(
                createPostRequest({
                    ...HOTEL_BODY,
                    name: "  Hotel Mar Azul  ",
                    email: " CONTATO@MarAzul.example.com ",
                }),
            );

            expect(createHotel).toHaveBeenCalledWith(MANAGER, {
                name: "Hotel Mar Azul",
                description: HOTEL_BODY.description,
                category: "4 estrelas",
                cnpj: "11222333000181",
                email: "contato@marazul.example.com",
            });
        });

        it("accepts an alphanumeric CNPJ", async () => {
            await POST(
                createPostRequest({
                    ...HOTEL_BODY,
                    cnpj: "12.ABC.345/01DE-35",
                }),
            );

            expect(createHotel.mock.calls[0][1].cnpj).toBe("12ABC34501DE35");
        });

        it("ignores status, owner and active flag sent by the client", async () => {
            await POST(
                createPostRequest({
                    ...HOTEL_BODY,
                    status: "PUBLISHED",
                    ownerUserId: "someone-else",
                    isActive: false,
                }),
            );

            const [, input] = createHotel.mock.calls[0];
            expect(Object.keys(input).sort()).toEqual([
                "category",
                "cnpj",
                "description",
                "email",
                "name",
            ]);
        });

        it("returns 400 INVALID_CNPJ for a CNPJ with wrong check digits", async () => {
            const response = await POST(
                createPostRequest({
                    ...HOTEL_BODY,
                    cnpj: "11.222.333/0001-82",
                }),
            );

            expect(response.status).toBe(400);
            expect(await response.json()).toEqual({
                success: false,
                error: { code: "INVALID_CNPJ", message: "CNPJ inválido." },
            });
            expect(createHotel).not.toHaveBeenCalled();
        });

        it("returns 400 when the CNPJ is missing (RN004)", async () => {
            const body = { ...HOTEL_BODY };
            delete body.cnpj;

            const response = await POST(createPostRequest(body));

            expect(response.status).toBe(400);
            const { error } = await response.json();
            expect(error).toEqual({
                code: "VALIDATION_ERROR",
                message: "Informe o CNPJ.",
            });
        });

        it("returns 400 when the body is not JSON", async () => {
            const request = new Request("http://localhost/api/hotels", {
                method: "POST",
                headers: { "content-type": "text/plain" },
                body: "hotel",
            });

            const response = await POST(request);

            expect(response.status).toBe(400);
            expect(createHotel).not.toHaveBeenCalled();
        });

        it("returns 401 without a session and does not read the body", async () => {
            requireRole.mockRejectedValueOnce(
                new UnauthorizedError("Faça login para continuar."),
            );
            const request = new Request("http://localhost/api/hotels", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: "{not json",
            });

            const response = await POST(request);

            expect(response.status).toBe(401);
            expect(createHotel).not.toHaveBeenCalled();
        });

        it("returns 403 for a customer or an administrator (RN109)", async () => {
            requireRole.mockRejectedValueOnce(
                new ForbiddenError("Sem acesso."),
            );

            const response = await POST(createPostRequest(HOTEL_BODY));

            expect(response.status).toBe(403);
            expect(createHotel).not.toHaveBeenCalled();
        });
    });
});
