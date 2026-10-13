import { beforeEach, describe, expect, it, vi } from "vitest";
import * as hotelRoute from "../../../../src/app/api/hotels/[id]/amenities/route.js";
import * as roomTypeRoute from "../../../../src/app/api/room-types/[id]/amenities/route.js";
import * as roomRoute from "../../../../src/app/api/rooms/[id]/amenities/route.js";
import * as unitRoute from "../../../../src/app/api/units/[id]/amenities/route.js";
import {
    NotFoundError,
    UnauthorizedError,
} from "../../../../src/lib/errors.js";
import {
    HOTEL_ID,
    createJsonRequest,
    createRouteContext,
} from "../../../helpers/http.js";

const { requireRole, listAmenities, replaceAmenities } = vi.hoisted(() => ({
    requireRole: vi.fn(),
    listAmenities: vi.fn(),
    replaceAmenities: vi.fn(),
}));

vi.mock("../../../../src/modules/auth/guards.js", () => ({ requireRole }));
vi.mock("../../../../src/services/amenity-association-service.js", () => ({
    amenityAssociationService: { listAmenities, replaceAmenities },
}));

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const AMENITY_ID = "a1b2c3d4-8b7d-4c6a-9e21-3f1c2a4e0003";

describe.each([
    ["hotel", "hotels", hotelRoute],
    ["unit", "units", unitRoute],
    ["roomType", "room-types", roomTypeRoute],
    ["room", "rooms", roomRoute],
])("/api/%s amenities", (target, segment, route) => {
    const url = `http://localhost/api/${segment}/${HOTEL_ID}/amenities`;

    beforeEach(() => {
        vi.clearAllMocks();
        requireRole.mockResolvedValue(MANAGER);
        listAmenities.mockResolvedValue([{ id: AMENITY_ID }]);
        replaceAmenities.mockResolvedValue([{ id: AMENITY_ID }]);
    });

    it("GET lists the amenities for a manager or an admin", async () => {
        const response = await route.GET(
            new Request(url),
            createRouteContext(),
        );

        expect(response.status).toBe(200);
        expect(requireRole).toHaveBeenCalledWith(["MANAGER", "ADMIN"]);
        expect(listAmenities).toHaveBeenCalledWith(MANAGER, target, HOTEL_ID);
    });

    it("PUT replaces the set with the ids de-duplicated", async () => {
        const response = await route.PUT(
            createJsonRequest(url, "PUT", {
                amenityIds: [AMENITY_ID, AMENITY_ID],
            }),
            createRouteContext(),
        );

        expect(response.status).toBe(200);
        expect(requireRole).toHaveBeenCalledWith(["MANAGER"]);
        expect(replaceAmenities).toHaveBeenCalledWith(
            MANAGER,
            target,
            HOTEL_ID,
            { amenityIds: [AMENITY_ID] },
        );
    });

    it("answers 400, 404 and 401", async () => {
        const invalidBody = await route.PUT(
            createJsonRequest(url, "PUT", { amenityIds: ["x"] }),
            createRouteContext(),
        );
        const invalidId = await route.GET(
            new Request(url),
            createRouteContext("x"),
        );
        replaceAmenities.mockRejectedValueOnce(
            new NotFoundError(
                "AMENITY_NOT_FOUND",
                "Comodidade não encontrada.",
            ),
        );
        const notFound = await route.PUT(
            createJsonRequest(url, "PUT", { amenityIds: [AMENITY_ID] }),
            createRouteContext(),
        );
        requireRole.mockRejectedValue(new UnauthorizedError());
        const anonymous = await route.GET(
            new Request(url),
            createRouteContext(),
        );

        expect(invalidBody.status).toBe(400);
        expect(invalidId.status).toBe(400);
        expect(notFound.status).toBe(404);
        expect(anonymous.status).toBe(401);
    });
});
