import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../../../src/app/api/geocoding/resolve-address/route.js";
import {
    ForbiddenError,
    NotFoundError,
    RateLimitError,
    ServiceUnavailableError,
    UnauthorizedError,
} from "../../../../src/lib/errors.js";
import { buildUnit } from "../../../helpers/factories/index.js";
import { createJsonRequest } from "../../../helpers/http.js";

const { requireRole, resolveAddress } = vi.hoisted(() => ({
    requireRole: vi.fn(),
    resolveAddress: vi.fn(),
}));

vi.mock("../../../../src/modules/auth/guards.js", () => ({ requireRole }));
vi.mock("../../../../src/modules/maps/geocoding-service.js", () => ({
    geocodingService: { resolveAddress },
}));

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const URL = "http://localhost/api/geocoding/resolve-address";
const ADDRESS = buildUnit().address;
const COORDINATES = Object.freeze({
    latitude: "-23.550520",
    longitude: "-46.633309",
});

function postAddress(body) {
    return POST(createJsonRequest(URL, "POST", body));
}

describe("POST /api/geocoding/resolve-address", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireRole.mockResolvedValue(MANAGER);
        resolveAddress.mockResolvedValue(COORDINATES);
    });

    it("returns the coordinates for a manager", async () => {
        const response = await postAddress({
            ...ADDRESS,
            latitude: 1,
            query: "qualquer coisa",
        });

        expect(response.status).toBe(200);
        expect((await response.json()).data).toEqual(COORDINATES);
        expect(requireRole).toHaveBeenCalledWith(["MANAGER"]);
        expect(resolveAddress).toHaveBeenCalledWith(MANAGER, {
            ...ADDRESS,
            zipCode: "01001000",
        });
    });

    it("answers 401 without a session", async () => {
        requireRole.mockRejectedValue(new UnauthorizedError("Faça login."));

        const response = await postAddress(ADDRESS);

        expect(response.status).toBe(401);
        expect(resolveAddress).not.toHaveBeenCalled();
    });

    it("answers 403 for another role", async () => {
        requireRole.mockRejectedValue(new ForbiddenError("Acesso negado."));

        const response = await postAddress(ADDRESS);

        expect(response.status).toBe(403);
    });

    it.each([
        ["an invalid zip code", { zipCode: "123" }],
        ["an unknown state", { state: "XX" }],
        ["no street", { street: " " }],
    ])("answers 400 for %s", async (_, overrides) => {
        const response = await postAddress({ ...ADDRESS, ...overrides });

        expect(response.status).toBe(400);
        expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
        expect(resolveAddress).not.toHaveBeenCalled();
    });

    it("answers 400 for a free-text query", async () => {
        const response = await postAddress({ q: "Praça da Sé, São Paulo" });

        expect(response.status).toBe(400);
        expect(resolveAddress).not.toHaveBeenCalled();
    });

    it("answers 429 with Retry-After when rate limited", async () => {
        resolveAddress.mockRejectedValue(
            new RateLimitError("Muitas consultas.", 120),
        );

        const response = await postAddress(ADDRESS);

        expect(response.status).toBe(429);
        expect(response.headers.get("Retry-After")).toBe("120");
    });

    it("answers 404 when the address is not found", async () => {
        resolveAddress.mockRejectedValue(
            new NotFoundError("GEOCODING_NOT_FOUND", "Não encontrado."),
        );

        const response = await postAddress(ADDRESS);

        expect(response.status).toBe(404);
        expect((await response.json()).error.code).toBe("GEOCODING_NOT_FOUND");
    });

    it("answers 503 when geocoding is unavailable", async () => {
        resolveAddress.mockRejectedValue(
            new ServiceUnavailableError("Indisponível."),
        );

        const response = await postAddress(ADDRESS);

        expect(response.status).toBe(503);
        expect((await response.json()).error.code).toBe("SERVICE_UNAVAILABLE");
    });
});
