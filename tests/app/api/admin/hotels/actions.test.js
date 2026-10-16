import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../../../../../src/lib/logger.js";
import { POST as approve } from "../../../../../src/app/api/admin/hotels/[id]/approve/route.js";
import { POST as block } from "../../../../../src/app/api/admin/hotels/[id]/block/route.js";
import { POST as requestChanges } from "../../../../../src/app/api/admin/hotels/[id]/request-changes/route.js";
import { POST as unblock } from "../../../../../src/app/api/admin/hotels/[id]/unblock/route.js";
import {
    ConflictError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
} from "../../../../../src/lib/errors.js";
import {
    HOTEL_ID,
    createJsonRequest,
    createRouteContext,
} from "../../../../helpers/http.js";

const {
    requireRole,
    approveHotel,
    blockHotel,
    requestHotelChanges,
    unblockHotel,
} = vi.hoisted(() => ({
    requireRole: vi.fn(),
    approveHotel: vi.fn(),
    blockHotel: vi.fn(),
    requestHotelChanges: vi.fn(),
    unblockHotel: vi.fn(),
}));

vi.mock("../../../../../src/modules/auth/guards.js", () => ({ requireRole }));
vi.mock("../../../../../src/services/hotel-service.js", () => ({
    hotelService: {
        approveHotel,
        blockHotel,
        requestHotelChanges,
        unblockHotel,
    },
}));

const ADMIN = Object.freeze({ id: "admin-1", role: "ADMIN" });

const REQUEST_HEADERS = Object.freeze({
    "x-request-id": "req-1",
    "x-forwarded-for": "203.0.113.7, 10.0.0.1",
    "user-agent": "Mozilla/5.0",
});

const EXPECTED_CONTEXT = Object.freeze({
    requestId: "req-1",
    ipAddress: "203.0.113.7",
    userAgent: "Mozilla/5.0",
});

const ROUTES = [
    {
        name: "approve",
        handler: approve,
        service: approveHotel,
        extra: {},
    },
    {
        name: "block",
        handler: block,
        service: blockHotel,
        extra: {},
    },
    {
        name: "request-changes",
        handler: requestChanges,
        service: requestHotelChanges,
        extra: {},
    },
    {
        name: "unblock",
        handler: unblock,
        service: unblockHotel,
        extra: { targetStatus: "PUBLISHED" },
    },
];

function createActionRequest(name, body, headers = REQUEST_HEADERS) {
    return createJsonRequest(
        `http://localhost/api/admin/hotels/${HOTEL_ID}/${name}`,
        "POST",
        body,
        headers,
    );
}

describe.each(ROUTES)(
    "POST /api/admin/hotels/:id/$name",
    ({ name, handler, service, extra }) => {
        beforeEach(() => {
            vi.clearAllMocks();
            requireRole.mockResolvedValue(ADMIN);
            service.mockResolvedValue({ id: HOTEL_ID, status: "PUBLISHED" });
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("runs the action as the administrator and returns the hotel", async () => {
            const response = await handler(
                createActionRequest(name, { reason: "Motivo.", ...extra }),
                createRouteContext(),
            );

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({
                success: true,
                data: { id: HOTEL_ID, status: "PUBLISHED" },
            });
            expect(requireRole).toHaveBeenCalledWith(["ADMIN"]);
        });

        it("hands the administrator, the hotel, the input and the request context to the service", async () => {
            await handler(
                createActionRequest(name, { reason: "Motivo.", ...extra }),
                createRouteContext(),
            );

            expect(service).toHaveBeenCalledWith(
                ADMIN,
                HOTEL_ID,
                { reason: "Motivo.", ...extra },
                EXPECTED_CONTEXT,
            );
        });

        it("trims the reason", async () => {
            await handler(
                createActionRequest(name, { reason: "  Motivo.  ", ...extra }),
                createRouteContext(),
            );

            expect(service.mock.calls[0][2].reason).toBe("Motivo.");
        });

        it.each([undefined, "", "   "])(
            "returns 400 when the reason is %j (RN108)",
            async (reason) => {
                const response = await handler(
                    createActionRequest(name, { reason, ...extra }),
                    createRouteContext(),
                );

                expect(response.status).toBe(400);
                expect((await response.json()).error.message).toBe(
                    "Informe o motivo da ação.",
                );
                expect(service).not.toHaveBeenCalled();
            },
        );

        it("returns 400 when the reason is longer than 1000 characters", async () => {
            const response = await handler(
                createActionRequest(name, {
                    reason: "m".repeat(1001),
                    ...extra,
                }),
                createRouteContext(),
            );

            expect(response.status).toBe(400);
            expect(service).not.toHaveBeenCalled();
        });

        it("returns 400 when the body is not JSON", async () => {
            const request = new Request(
                `http://localhost/api/admin/hotels/${HOTEL_ID}/${name}`,
                {
                    method: "POST",
                    headers: { "content-type": "text/plain" },
                    body: "Motivo.",
                },
            );

            const response = await handler(request, createRouteContext());

            expect(response.status).toBe(400);
            expect(service).not.toHaveBeenCalled();
        });

        it("returns 400 for an id that is not a UUID", async () => {
            const response = await handler(
                createActionRequest(name, { reason: "Motivo.", ...extra }),
                createRouteContext("hotel-1"),
            );

            expect(response.status).toBe(400);
            expect(service).not.toHaveBeenCalled();
        });

        it("returns 401 without a session, before reading the body", async () => {
            requireRole.mockRejectedValueOnce(
                new UnauthorizedError("Faça login para continuar."),
            );
            const request = new Request(
                `http://localhost/api/admin/hotels/${HOTEL_ID}/${name}`,
                {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: "{not json",
                },
            );

            const response = await handler(request, createRouteContext());

            expect(response.status).toBe(401);
            expect(service).not.toHaveBeenCalled();
        });

        it("returns 403 for a manager or a customer", async () => {
            requireRole.mockRejectedValueOnce(
                new ForbiddenError("Sem acesso."),
            );

            const response = await handler(
                createActionRequest(name, { reason: "Motivo.", ...extra }),
                createRouteContext(),
            );

            expect(response.status).toBe(403);
            expect((await response.json()).error.code).toBe("FORBIDDEN");
            expect(service).not.toHaveBeenCalled();
        });

        it("returns 404 HOTEL_NOT_FOUND when the hotel does not exist", async () => {
            service.mockRejectedValueOnce(
                new NotFoundError("HOTEL_NOT_FOUND", "Hotel não encontrado."),
            );

            const response = await handler(
                createActionRequest(name, { reason: "Motivo.", ...extra }),
                createRouteContext(),
            );

            expect(response.status).toBe(404);
            expect((await response.json()).error.code).toBe("HOTEL_NOT_FOUND");
        });

        it("returns 409 INVALID_HOTEL_STATUS when the status does not allow the action", async () => {
            service.mockRejectedValueOnce(
                new ConflictError(
                    "INVALID_HOTEL_STATUS",
                    "A ação não é permitida para o status atual do hotel.",
                ),
            );

            const response = await handler(
                createActionRequest(name, { reason: "Motivo.", ...extra }),
                createRouteContext(),
            );

            expect(response.status).toBe(409);
            expect((await response.json()).error.code).toBe(
                "INVALID_HOTEL_STATUS",
            );
        });

        it("hides unexpected errors, such as an audit log failure, behind 500 INTERNAL_ERROR", async () => {
            vi.spyOn(logger, "error").mockImplementation(() => {});
            service.mockRejectedValueOnce(
                new Error("insert into audit_log failed: password=hunter2"),
            );

            const response = await handler(
                createActionRequest(name, { reason: "Motivo.", ...extra }),
                createRouteContext(),
            );

            expect(response.status).toBe(500);
            const { error } = await response.json();
            expect(error.code).toBe("INTERNAL_ERROR");
            expect(JSON.stringify(error)).not.toContain("hunter2");
        });

        it("passes null for the request context values that are absent", async () => {
            await handler(
                createJsonRequest(
                    `http://localhost/api/admin/hotels/${HOTEL_ID}/${name}`,
                    "POST",
                    { reason: "Motivo.", ...extra },
                ),
                createRouteContext(),
            );

            expect(service.mock.calls[0][3]).toEqual({
                requestId: null,
                ipAddress: null,
                userAgent: null,
            });
        });
    },
);

describe("POST /api/admin/hotels/:id/unblock target status (RN106)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireRole.mockResolvedValue(ADMIN);
        unblockHotel.mockResolvedValue({ id: HOTEL_ID, status: "DRAFT" });
    });

    it.each(["PUBLISHED", "DRAFT"])(
        "forwards the target status %s to the service",
        async (targetStatus) => {
            await unblock(
                createActionRequest("unblock", {
                    reason: "Regularizado.",
                    targetStatus,
                }),
                createRouteContext(),
            );

            expect(unblockHotel).toHaveBeenCalledWith(
                ADMIN,
                HOTEL_ID,
                { reason: "Regularizado.", targetStatus },
                EXPECTED_CONTEXT,
            );
        },
    );

    it.each([undefined, "UNDER_REVIEW", "BLOCKED", "published", ""])(
        "returns 400 for the target status %j",
        async (targetStatus) => {
            const response = await unblock(
                createActionRequest("unblock", {
                    reason: "Regularizado.",
                    targetStatus,
                }),
                createRouteContext(),
            );

            expect(response.status).toBe(400);
            expect(unblockHotel).not.toHaveBeenCalled();
        },
    );
});
