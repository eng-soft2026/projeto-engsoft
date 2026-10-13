import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH } from "../../../../src/app/api/policies/[id]/route.js";
import {
    NotFoundError,
    UnauthorizedError,
} from "../../../../src/lib/errors.js";
import {
    HOTEL_ID,
    createJsonRequest,
    createRouteContext,
} from "../../../helpers/http.js";

const { requireRole, getPolicy, updatePolicy } = vi.hoisted(() => ({
    requireRole: vi.fn(),
    getPolicy: vi.fn(),
    updatePolicy: vi.fn(),
}));

vi.mock("../../../../src/modules/auth/guards.js", () => ({ requireRole }));
vi.mock("../../../../src/services/policy-service.js", () => ({
    policyService: { getPolicy, updatePolicy },
}));

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const URL = `http://localhost/api/policies/${HOTEL_ID}`;

describe("/api/policies/:id", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireRole.mockResolvedValue(MANAGER);
        getPolicy.mockResolvedValue({ id: "p1" });
        updatePolicy.mockResolvedValue({ id: "p1" });
    });

    it("GET returns the policy for a manager or an admin", async () => {
        const response = await GET(new Request(URL), createRouteContext());

        expect(response.status).toBe(200);
        expect(requireRole).toHaveBeenCalledWith(["MANAGER", "ADMIN"]);
        expect(getPolicy).toHaveBeenCalledWith(MANAGER, HOTEL_ID);
    });

    it("PATCH updates the policy, allowing a deactivation", async () => {
        const response = await PATCH(
            createJsonRequest(URL, "PATCH", { isActive: false }),
            createRouteContext(),
        );

        expect(response.status).toBe(200);
        expect(requireRole).toHaveBeenCalledWith(["MANAGER"]);
        expect(updatePolicy).toHaveBeenCalledWith(MANAGER, HOTEL_ID, {
            isActive: false,
        });
    });

    it("PATCH answers 400 for an empty body", async () => {
        const response = await PATCH(
            createJsonRequest(URL, "PATCH", {}),
            createRouteContext(),
        );

        expect(response.status).toBe(400);
        expect(updatePolicy).not.toHaveBeenCalled();
    });

    it("answers 404, 401 and 400 for a bad id", async () => {
        getPolicy.mockRejectedValueOnce(
            new NotFoundError("POLICY_NOT_FOUND", "Política não encontrada."),
        );
        const notFound = await GET(new Request(URL), createRouteContext());
        const invalidId = await GET(new Request(URL), createRouteContext("x"));
        requireRole.mockRejectedValue(new UnauthorizedError());
        const anonymous = await GET(new Request(URL), createRouteContext());

        expect(notFound.status).toBe(404);
        expect((await notFound.json()).error.code).toBe("POLICY_NOT_FOUND");
        expect(invalidId.status).toBe(400);
        expect(anonymous.status).toBe(401);
    });
});
