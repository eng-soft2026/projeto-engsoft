import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH } from "../../../../src/app/api/units/[id]/route.js";
import {
    ConflictError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
} from "../../../../src/lib/errors.js";
import {
    HOTEL_ID as UNIT_ID,
    createJsonRequest,
    createRouteContext,
} from "../../../helpers/http.js";

const { requireRole, getUnit, updateUnit } = vi.hoisted(() => ({
    requireRole: vi.fn(),
    getUnit: vi.fn(),
    updateUnit: vi.fn(),
}));

vi.mock("../../../../src/modules/auth/guards.js", () => ({ requireRole }));
vi.mock("../../../../src/services/unit-service.js", () => ({
    unitService: { getUnit, updateUnit },
}));

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const URL = `http://localhost/api/units/${UNIT_ID}`;

describe("/api/units/:id", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireRole.mockResolvedValue(MANAGER);
        getUnit.mockResolvedValue({ id: UNIT_ID });
        updateUnit.mockImplementation(async (manager, id, changes) => ({
            id,
            ...changes,
        }));
    });

    describe("GET", () => {
        it("returns the unit", async () => {
            const response = await GET(new Request(URL), createRouteContext());

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({
                success: true,
                data: { id: UNIT_ID },
            });
            expect(getUnit).toHaveBeenCalledWith(MANAGER, UNIT_ID);
            expect(requireRole).toHaveBeenCalledWith(["MANAGER", "ADMIN"]);
        });

        it("answers 404 UNIT_NOT_FOUND", async () => {
            getUnit.mockRejectedValue(
                new NotFoundError("UNIT_NOT_FOUND", "Unidade não encontrada."),
            );

            const response = await GET(new Request(URL), createRouteContext());

            expect(response.status).toBe(404);
            expect((await response.json()).error.code).toBe("UNIT_NOT_FOUND");
        });

        it("answers 400 for an invalid id and 401 without a session", async () => {
            const invalid = await GET(
                new Request(URL),
                createRouteContext("x"),
            );
            requireRole.mockRejectedValue(new UnauthorizedError());
            const anonymous = await GET(new Request(URL), createRouteContext());

            expect(invalid.status).toBe(400);
            expect(anonymous.status).toBe(401);
        });
    });

    describe("PATCH", () => {
        it("updates the unit with the validated changes", async () => {
            const response = await PATCH(
                createJsonRequest(URL, "PATCH", {
                    name: "Novo nome",
                    overbookingPercentage: 0,
                }),
                createRouteContext(),
            );

            expect(response.status).toBe(200);
            expect(requireRole).toHaveBeenCalledWith(["MANAGER"]);
            expect(updateUnit).toHaveBeenCalledWith(MANAGER, UNIT_ID, {
                name: "Novo nome",
                overbookingPercentage: 0,
            });
        });

        it("accepts the deactivation", async () => {
            const response = await PATCH(
                createJsonRequest(URL, "PATCH", { isActive: false }),
                createRouteContext(),
            );

            expect(response.status).toBe(200);
            expect(updateUnit).toHaveBeenCalledWith(MANAGER, UNIT_ID, {
                isActive: false,
            });
        });

        it.each([
            ["an empty body", {}],
            ["an overbooking of 11", { overbookingPercentage: 11 }],
            ["a reactivation", { isActive: true }],
            ["an invalid time", { checkOutTime: "25:00" }],
        ])("answers 400 for %s", async (label, body) => {
            const response = await PATCH(
                createJsonRequest(URL, "PATCH", body),
                createRouteContext(),
            );

            expect(response.status).toBe(400);
            expect(updateUnit).not.toHaveBeenCalled();
        });

        it("answers 409 when the hotel is not in DRAFT", async () => {
            updateUnit.mockRejectedValue(
                new ConflictError("INVALID_HOTEL_STATUS", "Status inválido."),
            );

            const response = await PATCH(
                createJsonRequest(URL, "PATCH", { name: "Novo" }),
                createRouteContext(),
            );

            expect(response.status).toBe(409);
        });

        it("answers 403 for a wrong role before reading the body", async () => {
            requireRole.mockRejectedValue(new ForbiddenError());

            const response = await PATCH(
                new Request(URL, { method: "PATCH", body: "oops" }),
                createRouteContext(),
            );

            expect(response.status).toBe(403);
        });
    });
});
