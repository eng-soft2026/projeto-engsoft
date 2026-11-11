import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "../../../../src/app/api/media/[id]/route.js";
import { POST } from "../../../../src/app/api/media/sign-upload/route.js";
import { ConflictError, NotFoundError } from "../../../../src/lib/errors.js";
import {
    HOTEL_ID,
    createJsonRequest,
    createRouteContext,
} from "../../../helpers/http.js";

const { requireRole, signUpload, deleteAsset } = vi.hoisted(() => ({
    requireRole: vi.fn(),
    signUpload: vi.fn(),
    deleteAsset: vi.fn(),
}));

vi.mock("../../../../src/modules/auth/guards.js", () => ({ requireRole }));
vi.mock("../../../../src/modules/media/media-service.js", () => ({
    mediaService: { signUpload, deleteAsset },
}));

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const ASSET_ID = "5d0b7a1c-9f33-4c6a-8b7d-3f1c2a4e9e21";
const SIGN_URL = "http://localhost/api/media/sign-upload";
const DELETE_URL = `http://localhost/api/media/${ASSET_ID}?scope=HOTEL&targetId=${HOTEL_ID}`;

function buildSignBody(overrides = {}) {
    return {
        scope: "HOTEL",
        targetId: HOTEL_ID,
        fileName: "fachada.JPG",
        mimeType: "IMAGE/JPEG",
        bytes: 2048,
        ...overrides,
    };
}

describe("/api/media", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireRole.mockResolvedValue(MANAGER);
        signUpload.mockResolvedValue({ signature: "assinatura-fake" });
        deleteAsset.mockResolvedValue({ assetId: ASSET_ID });
    });

    it("POST sign-upload returns the signed parameters for a manager", async () => {
        const response = await POST(
            createJsonRequest(SIGN_URL, "POST", buildSignBody()),
        );

        expect(response.status).toBe(200);
        expect((await response.json()).data).toEqual({
            signature: "assinatura-fake",
        });
        expect(requireRole).toHaveBeenCalledWith(["MANAGER"]);
        expect(signUpload).toHaveBeenCalledWith(MANAGER, {
            ...buildSignBody(),
            mimeType: "image/jpeg",
        });
    });

    it.each([
        ["an unknown scope", { scope: "REVIEW" }],
        ["a target that is not a UUID", { targetId: "hotel-1" }],
        ["a fractional size", { bytes: 10.5 }],
        ["a size of zero", { bytes: 0 }],
        ["no file name", { fileName: " " }],
    ])("POST sign-upload answers 400 for %s", async (_, overrides) => {
        const response = await POST(
            createJsonRequest(SIGN_URL, "POST", buildSignBody(overrides)),
        );

        expect(response.status).toBe(400);
        expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
        expect(signUpload).not.toHaveBeenCalled();
    });

    it("POST sign-upload answers 404 for a hotel of another manager", async () => {
        signUpload.mockRejectedValue(
            new NotFoundError("HOTEL_NOT_FOUND", "Hotel não encontrado."),
        );

        const response = await POST(
            createJsonRequest(SIGN_URL, "POST", buildSignBody()),
        );

        expect(response.status).toBe(404);
    });

    it("DELETE removes the asset identified by id, scope and target", async () => {
        const response = await DELETE(
            new Request(DELETE_URL, { method: "DELETE" }),
            createRouteContext(ASSET_ID),
        );

        expect(response.status).toBe(200);
        expect(requireRole).toHaveBeenCalledWith(["MANAGER"]);
        expect(deleteAsset).toHaveBeenCalledWith(MANAGER, {
            assetId: ASSET_ID,
            scope: "HOTEL",
            targetId: HOTEL_ID,
        });
    });

    it("DELETE answers 400 without the target in the query string", async () => {
        const response = await DELETE(
            new Request(`http://localhost/api/media/${ASSET_ID}`, {
                method: "DELETE",
            }),
            createRouteContext(ASSET_ID),
        );

        expect(response.status).toBe(400);
        expect(deleteAsset).not.toHaveBeenCalled();
    });

    it("DELETE answers 400 for an id that is not a UUID", async () => {
        const response = await DELETE(
            new Request(DELETE_URL, { method: "DELETE" }),
            createRouteContext("hotels%2Fx"),
        );

        expect(response.status).toBe(400);
    });

    it("DELETE answers 409 MEDIA_IN_USE for a registered image", async () => {
        deleteAsset.mockRejectedValue(
            new ConflictError("MEDIA_IN_USE", "A mídia está em uso."),
        );

        const response = await DELETE(
            new Request(DELETE_URL, { method: "DELETE" }),
            createRouteContext(ASSET_ID),
        );

        expect(response.status).toBe(409);
        expect((await response.json()).error.code).toBe("MEDIA_IN_USE");
    });
});
