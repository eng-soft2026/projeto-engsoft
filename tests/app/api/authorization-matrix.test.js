import { beforeEach, describe, expect, it, vi } from "vitest";
import * as adminHotelActionsApprove from "../../../src/app/api/admin/hotels/[id]/approve/route.js";
import * as adminHotelActionsBlock from "../../../src/app/api/admin/hotels/[id]/block/route.js";
import * as adminHotelActionsRequestChanges from "../../../src/app/api/admin/hotels/[id]/request-changes/route.js";
import * as adminHotelActionsUnblock from "../../../src/app/api/admin/hotels/[id]/unblock/route.js";
import * as adminHotels from "../../../src/app/api/admin/hotels/route.js";
import * as amenities from "../../../src/app/api/amenities/route.js";
import * as hotels from "../../../src/app/api/hotels/route.js";
import * as hotel from "../../../src/app/api/hotels/[id]/route.js";
import * as hotelAcceptances from "../../../src/app/api/hotels/[id]/acceptances/route.js";
import * as hotelAmenities from "../../../src/app/api/hotels/[id]/amenities/route.js";
import * as hotelImages from "../../../src/app/api/hotels/[id]/images/route.js";
import * as hotelImage from "../../../src/app/api/hotels/[id]/images/[imageId]/route.js";
import * as hotelManagers from "../../../src/app/api/hotels/[id]/managers/route.js";
import * as hotelManager from "../../../src/app/api/hotels/[id]/managers/[userId]/route.js";
import * as hotelPolicies from "../../../src/app/api/hotels/[id]/policies/route.js";
import * as hotelRoomTypes from "../../../src/app/api/hotels/[id]/room-types/route.js";
import * as hotelSubmitReview from "../../../src/app/api/hotels/[id]/submit-review/route.js";
import * as hotelUnits from "../../../src/app/api/hotels/[id]/units/route.js";
import * as media from "../../../src/app/api/media/[id]/route.js";
import * as mediaSignUpload from "../../../src/app/api/media/sign-upload/route.js";
import * as policies from "../../../src/app/api/policies/[id]/route.js";
import * as roomTypes from "../../../src/app/api/room-types/[id]/route.js";
import * as roomTypeAmenities from "../../../src/app/api/room-types/[id]/amenities/route.js";
import * as rooms from "../../../src/app/api/rooms/[id]/route.js";
import * as roomAmenities from "../../../src/app/api/rooms/[id]/amenities/route.js";
import * as units from "../../../src/app/api/units/[id]/route.js";
import * as unitAmenities from "../../../src/app/api/units/[id]/amenities/route.js";
import * as unitRooms from "../../../src/app/api/units/[id]/rooms/route.js";
import * as usersMe from "../../../src/app/api/users/me/route.js";
import { ROUTE_ACCESS_TABLE } from "../../architecture/route-access.table.js";
import { HOTEL_ID } from "../../helpers/http.js";

const { auth, findActiveUser, businessOperation, service } = vi.hoisted(() => {
    const businessOperation = vi.fn();
    return {
        auth: vi.fn(),
        findActiveUser: vi.fn(),
        businessOperation,
        service: new Proxy({}, { get: () => businessOperation }),
    };
});

vi.mock("../../../src/modules/auth/auth.js", () => ({ auth }));
vi.mock("../../../src/services/auth-service.js", () => ({
    authService: { findActiveUser },
}));
vi.mock("../../../src/services/acceptance-service.js", () => ({
    acceptanceService: service,
}));
vi.mock("../../../src/services/amenity-association-service.js", () => ({
    amenityAssociationService: service,
}));
vi.mock("../../../src/services/amenity-service.js", () => ({
    amenityService: service,
}));
vi.mock("../../../src/services/hotel-image-service.js", () => ({
    hotelImageService: service,
}));
vi.mock("../../../src/services/hotel-manager-service.js", () => ({
    hotelManagerService: service,
}));
vi.mock("../../../src/services/hotel-service.js", () => ({
    hotelService: service,
}));
vi.mock("../../../src/modules/media/media-service.js", () => ({
    mediaService: service,
}));
vi.mock("../../../src/services/policy-service.js", () => ({
    policyService: service,
}));
vi.mock("../../../src/services/room-service.js", () => ({
    roomService: service,
}));
vi.mock("../../../src/services/room-type-service.js", () => ({
    roomTypeService: service,
}));
vi.mock("../../../src/services/unit-service.js", () => ({
    unitService: service,
}));
vi.mock("../../../src/services/user-service.js", () => ({
    userService: service,
}));

const ROUTE_HANDLERS = new Map([
    ["/api/admin/hotels", adminHotels],
    ["/api/admin/hotels/:id/approve", adminHotelActionsApprove],
    ["/api/admin/hotels/:id/block", adminHotelActionsBlock],
    ["/api/admin/hotels/:id/request-changes", adminHotelActionsRequestChanges],
    ["/api/admin/hotels/:id/unblock", adminHotelActionsUnblock],
    ["/api/amenities", amenities],
    ["/api/hotels", hotels],
    ["/api/hotels/:id", hotel],
    ["/api/hotels/:id/acceptances", hotelAcceptances],
    ["/api/hotels/:id/amenities", hotelAmenities],
    ["/api/hotels/:id/images", hotelImages],
    ["/api/hotels/:id/images/:imageId", hotelImage],
    ["/api/hotels/:id/managers", hotelManagers],
    ["/api/hotels/:id/managers/:userId", hotelManager],
    ["/api/hotels/:id/policies", hotelPolicies],
    ["/api/hotels/:id/room-types", hotelRoomTypes],
    ["/api/hotels/:id/submit-review", hotelSubmitReview],
    ["/api/hotels/:id/units", hotelUnits],
    ["/api/media/:id", media],
    ["/api/media/sign-upload", mediaSignUpload],
    ["/api/policies/:id", policies],
    ["/api/room-types/:id", roomTypes],
    ["/api/room-types/:id/amenities", roomTypeAmenities],
    ["/api/rooms/:id", rooms],
    ["/api/rooms/:id/amenities", roomAmenities],
    ["/api/units/:id", units],
    ["/api/units/:id/amenities", unitAmenities],
    ["/api/units/:id/rooms", unitRooms],
    ["/api/users/me", usersMe],
]);

const PROTECTED_ROUTES = ROUTE_ACCESS_TABLE.filter(
    ({ access }) => access === "authenticated" || access === "roles",
);
const USER_ROLES = ["CUSTOMER", "MANAGER", "ADMIN"];

const FORBIDDEN_SCENARIOS = PROTECTED_ROUTES.flatMap((entry) => {
    if (entry.access === "authenticated") {
        return [];
    }

    return USER_ROLES.filter((role) => !entry.roles.includes(role)).map(
        (role) => ({ entry, role }),
    );
});

function routeKey({ method, path }) {
    return `${method} ${path}`;
}

function createRequest(entry) {
    const path = entry.path
        .replace(":id", HOTEL_ID)
        .replace(":userId", "7a1c9f33-8b7d-4c6a-9e21-3f1c2a4e5d0b");
    const hasBody = ["POST", "PUT", "PATCH"].includes(entry.method);

    return new Request(`http://localhost${path}`, {
        method: entry.method,
        headers: hasBody ? { "content-type": "application/json" } : undefined,
        body: hasBody ? "{}" : undefined,
    });
}

function createRouteContext(entry) {
    const params = Object.fromEntries(
        [...entry.path.matchAll(/:([^/]+)/g)].map(([, name]) => [
            name,
            name === "userId"
                ? "7a1c9f33-8b7d-4c6a-9e21-3f1c2a4e5d0b"
                : HOTEL_ID,
        ]),
    );

    return { params: Promise.resolve(params) };
}

function getHandler(entry) {
    const handler = ROUTE_HANDLERS.get(entry.path)?.[entry.method];
    if (!handler) {
        throw new Error(`Missing HTTP handler for ${routeKey(entry)}`);
    }
    return handler;
}

async function invokeHandler(entry) {
    return getHandler(entry)(createRequest(entry), createRouteContext(entry));
}

function signInAs(role) {
    const user = { id: `user-${role.toLowerCase()}`, role, isActive: true };
    auth.mockResolvedValue({ user: { id: user.id, role: user.role } });
    findActiveUser.mockResolvedValue(user);
}

describe("HTTP authorization matrix", () => {
    beforeEach(() => {
        auth.mockReset().mockResolvedValue(null);
        findActiveUser.mockReset();
        businessOperation.mockReset();
    });

    it("maps every protected matrix entry to an HTTP handler", () => {
        expect(PROTECTED_ROUTES).toHaveLength(50);
        for (const entry of PROTECTED_ROUTES) {
            expect(getHandler(entry), routeKey(entry)).toEqual(
                expect.any(Function),
            );
        }
    });

    it.each(PROTECTED_ROUTES)(
        "returns 401 without a session for $method $path",
        async (entry) => {
            const response = await invokeHandler(entry);

            expect(response.status).toBe(401);
            expect((await response.json()).error.code).toBe("UNAUTHORIZED");
            expect(auth).toHaveBeenCalledOnce();
            expect(findActiveUser).not.toHaveBeenCalled();
            expect(businessOperation).not.toHaveBeenCalled();
        },
    );

    it.each(FORBIDDEN_SCENARIOS)(
        "returns 403 for $role on $entry.method $entry.path",
        async ({ entry, role }) => {
            signInAs(role);

            const response = await invokeHandler(entry);

            expect(response.status).toBe(403);
            expect((await response.json()).error.code).toBe("FORBIDDEN");
            expect(auth).toHaveBeenCalledOnce();
            expect(findActiveUser).toHaveBeenCalledOnce();
            expect(businessOperation).not.toHaveBeenCalled();
        },
    );
});
