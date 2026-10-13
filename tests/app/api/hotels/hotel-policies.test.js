import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    GET,
    POST,
} from "../../../../src/app/api/hotels/[id]/policies/route.js";
import {
    ConflictError,
    UnauthorizedError,
} from "../../../../src/lib/errors.js";
import {
    HOTEL_ID,
    createJsonRequest,
    createRouteContext,
} from "../../../helpers/http.js";

const { requireRole, listPolicies, createPolicy } = vi.hoisted(() => ({
    requireRole: vi.fn(),
    listPolicies: vi.fn(),
    createPolicy: vi.fn(),
}));

vi.mock("../../../../src/modules/auth/guards.js", () => ({ requireRole }));
vi.mock("../../../../src/services/policy-service.js", () => ({
    policyService: { listPolicies, createPolicy },
}));

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const URL = `http://localhost/api/hotels/${HOTEL_ID}/policies`;
const BODY = Object.freeze({
    type: "QUIET_HOURS",
    title: " Silêncio ",
    description: "Das 22h às 7h.",
});

describe("/api/hotels/:id/policies", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireRole.mockResolvedValue(MANAGER);
        listPolicies.mockResolvedValue([{ id: "p1" }]);
        createPolicy.mockResolvedValue({ id: "p1" });
    });

    it("GET lists the policies for a manager or an admin", async () => {
        const response = await GET(new Request(URL), createRouteContext());

        expect(response.status).toBe(200);
        expect(requireRole).toHaveBeenCalledWith(["MANAGER", "ADMIN"]);
        expect(listPolicies).toHaveBeenCalledWith(MANAGER, HOTEL_ID);
    });

    it("POST creates the policy and answers 201, ignoring isSystem", async () => {
        const response = await POST(
            createJsonRequest(URL, "POST", { ...BODY, isSystem: true }),
            createRouteContext(),
        );

        expect(response.status).toBe(201);
        expect(createPolicy).toHaveBeenCalledWith(MANAGER, HOTEL_ID, {
            type: "QUIET_HOURS",
            title: "Silêncio",
            description: "Das 22h às 7h.",
        });
    });

    it("POST answers 400 for an unknown type", async () => {
        const response = await POST(
            createJsonRequest(URL, "POST", { ...BODY, type: "PETS" }),
            createRouteContext(),
        );

        expect(response.status).toBe(400);
        expect(createPolicy).not.toHaveBeenCalled();
    });

    it("answers 409, 401 and 400 for a bad id", async () => {
        createPolicy.mockRejectedValueOnce(
            new ConflictError("INVALID_HOTEL_STATUS", "Status inválido."),
        );
        const conflict = await POST(
            createJsonRequest(URL, "POST", BODY),
            createRouteContext(),
        );
        const invalidId = await GET(new Request(URL), createRouteContext("x"));
        requireRole.mockRejectedValue(new UnauthorizedError());
        const anonymous = await GET(new Request(URL), createRouteContext());

        expect(conflict.status).toBe(409);
        expect(invalidId.status).toBe(400);
        expect(anonymous.status).toBe(401);
    });
});
