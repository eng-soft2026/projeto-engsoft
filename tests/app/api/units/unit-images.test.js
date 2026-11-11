import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    DELETE,
    PATCH,
} from "../../../../src/app/api/units/[id]/images/[imageId]/route.js";
import { GET, POST } from "../../../../src/app/api/units/[id]/images/route.js";
import {
    ConflictError,
    ForbiddenError,
    NotFoundError,
} from "../../../../src/lib/errors.js";
import { HOTEL_ID, createJsonRequest } from "../../../helpers/http.js";

const { requireRole, listImages, addImage, updateImage, deleteImage } =
    vi.hoisted(() => ({
        requireRole: vi.fn(),
        listImages: vi.fn(),
        addImage: vi.fn(),
        updateImage: vi.fn(),
        deleteImage: vi.fn(),
    }));

vi.mock("../../../../src/modules/auth/guards.js", () => ({ requireRole }));
vi.mock("../../../../src/services/unit-image-service.js", () => ({
    unitImageService: { listImages, addImage, updateImage, deleteImage },
}));

const UNIT_ID = HOTEL_ID;
const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const IMAGE_ID = "7a1c9f33-8b7d-4c6a-9e21-3f1c2a4e5d0b";
const ASSET_ID = "5d0b7a1c-9f33-4c6a-9e21-3f1c2a4e8b7d";
const URL = `http://localhost/api/units/${UNIT_ID}/images`;
const IMAGE_URL = `${URL}/${IMAGE_ID}`;

function createContext(params = {}) {
    return {
        params: Promise.resolve({ id: UNIT_ID, imageId: IMAGE_ID, ...params }),
    };
}

async function readErrorCode(response) {
    return (await response.json()).error.code;
}

describe("/api/units/:id/images", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireRole.mockResolvedValue(MANAGER);
        listImages.mockResolvedValue([{ id: IMAGE_ID }]);
        addImage.mockResolvedValue({ id: IMAGE_ID, isCover: true });
    });

    it("GET lists the gallery for a manager or an admin", async () => {
        const response = await GET(new Request(URL), createContext());

        expect(response.status).toBe(200);
        expect(requireRole).toHaveBeenCalledWith(["MANAGER", "ADMIN"]);
        expect(listImages).toHaveBeenCalledWith(MANAGER, UNIT_ID);
        expect((await response.json()).data).toEqual([{ id: IMAGE_ID }]);
    });

    it("POST registers the uploaded asset, ignoring client metadata, and answers 201", async () => {
        const response = await POST(
            createJsonRequest(URL, "POST", {
                assetId: ASSET_ID,
                isCover: true,
                url: "https://example.com/fake.jpg",
                bytes: 1,
            }),
            createContext(),
        );

        expect(response.status).toBe(201);
        expect(requireRole).toHaveBeenCalledWith(["MANAGER"]);
        expect(addImage).toHaveBeenCalledWith(MANAGER, UNIT_ID, {
            assetId: ASSET_ID,
            isCover: true,
        });
    });

    it("POST answers 400 without a valid assetId", async () => {
        const response = await POST(
            createJsonRequest(URL, "POST", { assetId: "x" }),
            createContext(),
        );

        expect(response.status).toBe(400);
        expect(addImage).not.toHaveBeenCalled();
    });

    it("POST answers 409 for an asset already registered", async () => {
        addImage.mockRejectedValueOnce(
            new ConflictError("MEDIA_IN_USE", "Já registrada."),
        );

        const response = await POST(
            createJsonRequest(URL, "POST", { assetId: ASSET_ID }),
            createContext(),
        );

        expect(response.status).toBe(409);
        expect(await readErrorCode(response)).toBe("MEDIA_IN_USE");
    });

    it("answers 403 for the wrong role and 400 for a bad unit id", async () => {
        const invalidId = await GET(
            new Request(URL),
            createContext({ id: "x" }),
        );
        requireRole.mockRejectedValueOnce(new ForbiddenError("Proibido."));
        const forbidden = await POST(
            createJsonRequest(URL, "POST", { assetId: ASSET_ID }),
            createContext(),
        );

        expect(invalidId.status).toBe(400);
        expect(forbidden.status).toBe(403);
    });
});

describe("/api/units/:id/images/:imageId", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireRole.mockResolvedValue(MANAGER);
        updateImage.mockResolvedValue({ id: IMAGE_ID, position: 1 });
        deleteImage.mockResolvedValue({ id: IMAGE_ID, removed: true });
    });

    it("PATCH reorders and sets the cover", async () => {
        const response = await PATCH(
            createJsonRequest(IMAGE_URL, "PATCH", {
                position: 1,
                isCover: true,
            }),
            createContext(),
        );

        expect(response.status).toBe(200);
        expect(requireRole).toHaveBeenCalledWith(["MANAGER"]);
        expect(updateImage).toHaveBeenCalledWith(MANAGER, UNIT_ID, IMAGE_ID, {
            position: 1,
            isCover: true,
        });
    });

    it("PATCH refuses an empty body, isCover false and an invalid position", async () => {
        const bodies = [
            {},
            { isCover: false },
            { position: -1 },
            { position: 1.5 },
        ];

        const responses = await Promise.all(
            bodies.map((body) =>
                PATCH(
                    createJsonRequest(IMAGE_URL, "PATCH", body),
                    createContext(),
                ),
            ),
        );

        expect(responses.map(({ status }) => status)).toEqual([
            400, 400, 400, 400,
        ]);
        expect(updateImage).not.toHaveBeenCalled();
    });

    it("PATCH accepts a position past ten, since a unit has no photo limit", async () => {
        const response = await PATCH(
            createJsonRequest(IMAGE_URL, "PATCH", { position: 25 }),
            createContext(),
        );

        expect(response.status).toBe(200);
        expect(updateImage).toHaveBeenCalledWith(MANAGER, UNIT_ID, IMAGE_ID, {
            position: 25,
        });
    });

    it("DELETE removes the photo", async () => {
        const response = await DELETE(
            new Request(IMAGE_URL, { method: "DELETE" }),
            createContext(),
        );

        expect(response.status).toBe(200);
        expect(requireRole).toHaveBeenCalledWith(["MANAGER"]);
        expect(deleteImage).toHaveBeenCalledWith(MANAGER, UNIT_ID, IMAGE_ID);
        expect((await response.json()).data).toEqual({
            id: IMAGE_ID,
            removed: true,
        });
    });

    it("DELETE answers 404 for an unknown photo and 400 for a bad image id", async () => {
        deleteImage.mockRejectedValueOnce(
            new NotFoundError("UNIT_IMAGE_NOT_FOUND", "Foto não encontrada."),
        );
        const notFound = await DELETE(
            new Request(IMAGE_URL, { method: "DELETE" }),
            createContext(),
        );
        const invalidId = await DELETE(
            new Request(IMAGE_URL, { method: "DELETE" }),
            createContext({ imageId: "x" }),
        );

        expect(notFound.status).toBe(404);
        expect(await readErrorCode(notFound)).toBe("UNIT_IMAGE_NOT_FOUND");
        expect(invalidId.status).toBe(400);
    });
});
