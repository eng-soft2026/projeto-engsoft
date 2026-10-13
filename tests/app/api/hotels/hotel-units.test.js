import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../../../../src/app/api/hotels/[id]/units/route.js";
import {
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
} from "../../../../src/lib/errors.js";
import {
    HOTEL_ID,
    createJsonRequest,
    createRouteContext,
} from "../../../helpers/http.js";

const { requireRole, listUnits, createUnit } = vi.hoisted(() => ({
    requireRole: vi.fn(),
    listUnits: vi.fn(),
    createUnit: vi.fn(),
}));

vi.mock("../../../../src/modules/auth/guards.js", () => ({ requireRole }));
vi.mock("../../../../src/services/unit-service.js", () => ({
    unitService: { listUnits, createUnit },
}));

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const URL = `http://localhost/api/hotels/${HOTEL_ID}/units`;

const VALID_BODY = Object.freeze({
    name: "Unidade Paulista",
    email: "paulista@marazul.example.com",
    checkInTime: "14:00",
    checkOutTime: "12:00",
    overbookingPercentage: 5,
    address: {
        zipCode: "01310-100",
        street: "Avenida Paulista",
        number: "1000",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
    },
    phones: ["(11) 91234-5678"],
});

describe("/api/hotels/:id/units", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireRole.mockResolvedValue(MANAGER);
        listUnits.mockResolvedValue([{ id: "unit-1" }]);
        createUnit.mockResolvedValue({ id: "unit-1" });
    });

    describe("GET", () => {
        it("lists the units of the hotel", async () => {
            const response = await GET(new Request(URL), createRouteContext());

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({
                success: true,
                data: [{ id: "unit-1" }],
            });
            expect(listUnits).toHaveBeenCalledWith(MANAGER, HOTEL_ID);
        });

        it("accepts managers and administrators", async () => {
            await GET(new Request(URL), createRouteContext());

            expect(requireRole).toHaveBeenCalledWith(["MANAGER", "ADMIN"]);
        });

        it("answers 401 without a session", async () => {
            requireRole.mockRejectedValue(new UnauthorizedError());

            const response = await GET(new Request(URL), createRouteContext());

            expect(response.status).toBe(401);
        });

        it("answers 400 for an invalid hotel id", async () => {
            const response = await GET(
                new Request(URL),
                createRouteContext("not-a-uuid"),
            );

            expect(response.status).toBe(400);
            expect(listUnits).not.toHaveBeenCalled();
        });

        it("answers 404 when the service hides the hotel", async () => {
            listUnits.mockRejectedValue(
                new NotFoundError("HOTEL_NOT_FOUND", "Hotel não encontrado."),
            );

            const response = await GET(new Request(URL), createRouteContext());

            expect(response.status).toBe(404);
        });
    });

    describe("POST", () => {
        it("creates the unit and answers 201 with the normalized input", async () => {
            const response = await POST(
                createJsonRequest(URL, "POST", VALID_BODY),
                createRouteContext(),
            );

            expect(response.status).toBe(201);
            expect(requireRole).toHaveBeenCalledWith(["MANAGER"]);
            expect(createUnit).toHaveBeenCalledWith(
                MANAGER,
                HOTEL_ID,
                expect.objectContaining({
                    overbookingPercentage: 5,
                    phones: ["11912345678"],
                    address: expect.objectContaining({ zipCode: "01310100" }),
                }),
            );
        });

        it("ignores latitude and longitude from the body (RN088)", async () => {
            await POST(
                createJsonRequest(URL, "POST", {
                    ...VALID_BODY,
                    address: {
                        ...VALID_BODY.address,
                        latitude: 1,
                        longitude: 2,
                    },
                }),
                createRouteContext(),
            );

            const [, , input] = createUnit.mock.calls[0];
            expect(input.address).not.toHaveProperty("latitude");
            expect(input.address).not.toHaveProperty("longitude");
        });

        it("answers 400 for an overbooking above 10 without calling the service", async () => {
            const response = await POST(
                createJsonRequest(URL, "POST", {
                    ...VALID_BODY,
                    overbookingPercentage: 11,
                }),
                createRouteContext(),
            );

            expect(response.status).toBe(400);
            expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
            expect(createUnit).not.toHaveBeenCalled();
        });

        it("answers 400 for a body that is not JSON", async () => {
            const response = await POST(
                new Request(URL, { method: "POST", body: "oops" }),
                createRouteContext(),
            );

            expect(response.status).toBe(400);
            expect(createUnit).not.toHaveBeenCalled();
        });

        it("checks the role before reading the body", async () => {
            requireRole.mockRejectedValue(new ForbiddenError());

            const response = await POST(
                new Request(URL, { method: "POST", body: "oops" }),
                createRouteContext(),
            );

            expect(response.status).toBe(403);
        });

        it("answers 401 without a session", async () => {
            requireRole.mockRejectedValue(new UnauthorizedError());

            const response = await POST(
                createJsonRequest(URL, "POST", VALID_BODY),
                createRouteContext(),
            );

            expect(response.status).toBe(401);
        });
    });
});
