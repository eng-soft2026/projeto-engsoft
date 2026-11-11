import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "../../../../src/app/api/units/[id]/location/route.js";
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

const { requireRole, updateUnitLocation } = vi.hoisted(() => ({
    requireRole: vi.fn(),
    updateUnitLocation: vi.fn(),
}));

vi.mock("../../../../src/modules/auth/guards.js", () => ({ requireRole }));
vi.mock("../../../../src/services/unit-service.js", () => ({
    unitService: { updateUnitLocation },
}));

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const URL = `http://localhost/api/units/${UNIT_ID}/location`;
const LOCATION = Object.freeze({
    latitude: "-23.561414",
    longitude: "-46.655881",
});

describe("PATCH /api/units/:id/location", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireRole.mockResolvedValue(MANAGER);
        updateUnitLocation.mockImplementation(
            async (manager, id, location) => ({
                id,
                address: location,
            }),
        );
    });

    it("stores the corrected marker position", async () => {
        const response = await PATCH(
            createJsonRequest(URL, "PATCH", {
                latitude: -23.561414,
                longitude: "-46.655881",
            }),
            createRouteContext(),
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            success: true,
            data: { id: UNIT_ID, address: LOCATION },
        });
        expect(requireRole).toHaveBeenCalledWith(["MANAGER"]);
        expect(updateUnitLocation).toHaveBeenCalledWith(
            MANAGER,
            UNIT_ID,
            LOCATION,
        );
    });

    it.each([
        ["an empty body", {}],
        ["a position outside Brazil", { latitude: 38.72, longitude: -9.14 }],
        [
            "more than 6 decimals",
            { latitude: "-23.5614141", longitude: "-46.655881" },
        ],
    ])("answers 400 for %s", async (label, body) => {
        const response = await PATCH(
            createJsonRequest(URL, "PATCH", body),
            createRouteContext(),
        );

        expect(response.status).toBe(400);
        expect(updateUnitLocation).not.toHaveBeenCalled();
    });

    it("answers 400 for an invalid id", async () => {
        const response = await PATCH(
            createJsonRequest(URL, "PATCH", LOCATION),
            createRouteContext("not-a-uuid"),
        );

        expect(response.status).toBe(400);
        expect(updateUnitLocation).not.toHaveBeenCalled();
    });

    it("answers 404 for a unit the manager cannot manage", async () => {
        updateUnitLocation.mockRejectedValue(
            new NotFoundError("UNIT_NOT_FOUND", "Unidade não encontrada."),
        );

        const response = await PATCH(
            createJsonRequest(URL, "PATCH", LOCATION),
            createRouteContext(),
        );

        expect(response.status).toBe(404);
    });

    it("answers 409 when the hotel is not in DRAFT", async () => {
        updateUnitLocation.mockRejectedValue(
            new ConflictError("INVALID_HOTEL_STATUS", "Status inválido."),
        );

        const response = await PATCH(
            createJsonRequest(URL, "PATCH", LOCATION),
            createRouteContext(),
        );

        expect(response.status).toBe(409);
    });

    it("answers 401 without a session and 403 for a wrong role", async () => {
        requireRole.mockRejectedValueOnce(new UnauthorizedError());
        const unauthorized = await PATCH(
            createJsonRequest(URL, "PATCH", LOCATION),
            createRouteContext(),
        );

        requireRole.mockRejectedValueOnce(new ForbiddenError());
        const forbidden = await PATCH(
            new Request(URL, { method: "PATCH", body: "oops" }),
            createRouteContext(),
        );

        expect(unauthorized.status).toBe(401);
        expect(forbidden.status).toBe(403);
        expect(updateUnitLocation).not.toHaveBeenCalled();
    });
});
