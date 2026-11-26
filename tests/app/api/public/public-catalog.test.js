import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getPublicHotel } from "../../../../src/app/api/public/hotels/[id]/route.js";
import { GET as getPublicRoom } from "../../../../src/app/api/public/rooms/[id]/route.js";
import { GET as getPublicUnit } from "../../../../src/app/api/public/units/[id]/route.js";
import { NotFoundError } from "../../../../src/lib/errors.js";
import { HOTEL_ID as ID, createRouteContext } from "../../../helpers/http.js";

const { auth, getHotel, getUnit, getRoom } = vi.hoisted(() => ({
    auth: vi.fn(),
    getHotel: vi.fn(),
    getUnit: vi.fn(),
    getRoom: vi.fn(),
}));

vi.mock("../../../../src/modules/auth/auth.js", () => ({ auth }));
vi.mock("../../../../src/services/public-catalog-service.js", () => ({
    publicCatalogService: { getHotel, getUnit, getRoom },
}));

const ROUTES = [
    {
        name: "hotels",
        handler: getPublicHotel,
        serviceMethod: getHotel,
        notFoundCode: "HOTEL_NOT_FOUND",
    },
    {
        name: "units",
        handler: getPublicUnit,
        serviceMethod: getUnit,
        notFoundCode: "UNIT_NOT_FOUND",
    },
    {
        name: "rooms",
        handler: getPublicRoom,
        serviceMethod: getRoom,
        notFoundCode: "ROOM_NOT_FOUND",
    },
];

function createRequest(name, id = ID) {
    return new Request(`http://localhost/api/public/${name}/${id}`);
}

describe("/api/public/*/:id", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        auth.mockResolvedValue(null);
        getHotel.mockResolvedValue({ id: ID });
        getUnit.mockResolvedValue({ id: ID });
        getRoom.mockResolvedValue({ id: ID });
    });

    it.each(ROUTES)(
        "GET /api/public/$name/:id answers 200 without a session",
        async ({ name, handler, serviceMethod }) => {
            const response = await handler(
                createRequest(name),
                createRouteContext(),
            );

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({
                success: true,
                data: { id: ID },
            });
            expect(serviceMethod).toHaveBeenCalledWith(ID);
            expect(auth).not.toHaveBeenCalled();
        },
    );

    it.each(ROUTES)(
        "GET /api/public/$name/:id answers 404 when the item is not public",
        async ({ name, handler, serviceMethod, notFoundCode }) => {
            serviceMethod.mockRejectedValue(
                new NotFoundError(notFoundCode, "Não encontrado."),
            );

            const response = await handler(
                createRequest(name),
                createRouteContext(),
            );

            expect(response.status).toBe(404);
            expect((await response.json()).error.code).toBe(notFoundCode);
        },
    );

    it.each(ROUTES)(
        "GET /api/public/$name/:id answers 400 for an id that is not a UUID",
        async ({ name, handler, serviceMethod }) => {
            const response = await handler(
                createRequest(name, "nao-e-uuid"),
                createRouteContext("nao-e-uuid"),
            );

            expect(response.status).toBe(400);
            expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
            expect(serviceMethod).not.toHaveBeenCalled();
        },
    );
});
