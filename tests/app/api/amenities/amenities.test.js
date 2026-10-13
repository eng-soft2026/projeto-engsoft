import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../../../../src/app/api/amenities/route.js";
import {
    ConflictError,
    UnauthorizedError,
} from "../../../../src/lib/errors.js";
import { createJsonRequest } from "../../../helpers/http.js";

const { requireRole, listAmenities, createAmenity } = vi.hoisted(() => ({
    requireRole: vi.fn(),
    listAmenities: vi.fn(),
    createAmenity: vi.fn(),
}));

vi.mock("../../../../src/modules/auth/guards.js", () => ({ requireRole }));
vi.mock("../../../../src/services/amenity-service.js", () => ({
    amenityService: { listAmenities, createAmenity },
}));

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const URL = "http://localhost/api/amenities";

describe("/api/amenities", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireRole.mockResolvedValue(MANAGER);
        listAmenities.mockResolvedValue([{ id: "a1" }]);
        createAmenity.mockResolvedValue({ id: "a2" });
    });

    it("GET lists the amenities of a manager", async () => {
        const response = await GET();

        expect(response.status).toBe(200);
        expect((await response.json()).data).toEqual([{ id: "a1" }]);
        expect(requireRole).toHaveBeenCalledWith(["MANAGER"]);
    });

    it("POST creates the amenity and answers 201", async () => {
        const response = await POST(
            createJsonRequest(URL, "POST", { name: " Piscina " }),
        );

        expect(response.status).toBe(201);
        expect(createAmenity).toHaveBeenCalledWith(MANAGER, {
            name: "Piscina",
        });
    });

    it("POST answers 400 for a short name and 409 for a duplicate", async () => {
        const invalid = await POST(
            createJsonRequest(URL, "POST", { name: "A" }),
        );
        createAmenity.mockRejectedValueOnce(
            new ConflictError("AMENITY_ALREADY_EXISTS", "Já existe."),
        );
        const duplicate = await POST(
            createJsonRequest(URL, "POST", { name: "Piscina" }),
        );

        expect(invalid.status).toBe(400);
        expect(duplicate.status).toBe(409);
        expect((await duplicate.json()).error.code).toBe(
            "AMENITY_ALREADY_EXISTS",
        );
    });

    it("answers 401 without a session", async () => {
        requireRole.mockRejectedValue(new UnauthorizedError());

        expect((await GET()).status).toBe(401);
    });
});
