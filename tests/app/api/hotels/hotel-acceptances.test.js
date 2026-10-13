import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    GET,
    PUT,
} from "../../../../src/app/api/hotels/[id]/acceptances/route.js";
import {
    ConflictError,
    UnauthorizedError,
} from "../../../../src/lib/errors.js";
import {
    HOTEL_ID,
    createJsonRequest,
    createRouteContext,
} from "../../../helpers/http.js";

const { requireRole, listAcceptances, replaceAcceptances } = vi.hoisted(() => ({
    requireRole: vi.fn(),
    listAcceptances: vi.fn(),
    replaceAcceptances: vi.fn(),
}));

vi.mock("../../../../src/modules/auth/guards.js", () => ({ requireRole }));
vi.mock("../../../../src/services/acceptance-service.js", () => ({
    acceptanceService: { listAcceptances, replaceAcceptances },
}));

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const URL = `http://localhost/api/hotels/${HOTEL_ID}/acceptances`;

describe("/api/hotels/:id/acceptances", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireRole.mockResolvedValue(MANAGER);
        listAcceptances.mockResolvedValue([{ id: "acc-1" }]);
        replaceAcceptances.mockResolvedValue([{ id: "acc-1" }]);
    });

    it("GET lists the rules for a manager or an admin", async () => {
        const response = await GET(new Request(URL), createRouteContext());

        expect(response.status).toBe(200);
        expect(requireRole).toHaveBeenCalledWith(["MANAGER", "ADMIN"]);
        expect(listAcceptances).toHaveBeenCalledWith(MANAGER, HOTEL_ID);
    });

    it("PUT replaces the rules with the normalized body", async () => {
        const response = await PUT(
            createJsonRequest(URL, "PUT", {
                acceptances: [
                    { type: "PETS", isAllowed: true },
                    {
                        type: "OTHER",
                        customLabel: " Som alto ",
                        isAllowed: false,
                    },
                ],
            }),
            createRouteContext(),
        );

        expect(response.status).toBe(200);
        expect(requireRole).toHaveBeenCalledWith(["MANAGER"]);
        expect(replaceAcceptances).toHaveBeenCalledWith(MANAGER, HOTEL_ID, {
            acceptances: [
                {
                    type: "PETS",
                    customLabel: null,
                    isAllowed: true,
                    details: null,
                },
                {
                    type: "OTHER",
                    customLabel: "Som alto",
                    isAllowed: false,
                    details: null,
                },
            ],
        });
    });

    it.each([
        [{ acceptances: [{ type: "OTHER", isAllowed: true }] }],
        [
            {
                acceptances: [
                    { type: "PETS", isAllowed: true },
                    { type: "PETS", isAllowed: false },
                ],
            },
        ],
        [
            {
                acceptances: [
                    { type: "PETS", customLabel: "x", isAllowed: true },
                ],
            },
        ],
    ])("PUT answers 400 for %j", async (body) => {
        const response = await PUT(
            createJsonRequest(URL, "PUT", body),
            createRouteContext(),
        );

        expect(response.status).toBe(400);
        expect(replaceAcceptances).not.toHaveBeenCalled();
    });

    it("answers 409, 401 and 400 for a bad id", async () => {
        replaceAcceptances.mockRejectedValueOnce(
            new ConflictError("INVALID_HOTEL_STATUS", "Status inválido."),
        );
        const conflict = await PUT(
            createJsonRequest(URL, "PUT", { acceptances: [] }),
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
