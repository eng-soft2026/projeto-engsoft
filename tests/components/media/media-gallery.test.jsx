import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { MEDIA_SCOPES } from "../../../src/constants/media.js";
import { ApiError, apiFetch } from "../../../src/lib/api-client.js";
import { ERROR_CODES } from "../../../src/lib/errors.js";
import {
    CLOUDINARY_UPLOAD_FAILED_MESSAGE,
    CloudinaryUploadError,
    uploadToCloudinary,
} from "../../../src/modules/media/cloudinary-upload.js";
import { MediaGallery } from "../../../src/modules/media/components/media-gallery.jsx";
import { renderWithUser } from "../../helpers/render.jsx";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../../../src/lib/api-client.js", async (importOriginal) => ({
    ...(await importOriginal()),
    apiFetch: vi.fn(),
}));
vi.mock(
    "../../../src/modules/media/cloudinary-upload.js",
    async (importOriginal) => ({
        ...(await importOriginal()),
        uploadToCloudinary: vi.fn(),
    }),
);

const HOTEL_ID = "6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const ROOM_TYPE_ID = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const MAX_BYTES = 10 * 1024 * 1024;
const HOTEL_IMAGES_PATH = `/api/hotels/${HOTEL_ID}/images`;
const SIGN_PATH = "/api/media/sign-upload";

function buildImage(index, overrides = {}) {
    return {
        id: `image-${index}`,
        url: `https://res.cloudinary.com/demo/image/upload/foto-${index}.jpg`,
        position: index,
        width: 1200,
        height: 800,
        isCover: index === 0,
        ...overrides,
    };
}

function buildSigned(assetId = "asset-1") {
    return {
        assetId,
        publicId: `hotels/${HOTEL_ID}/${assetId}`,
        uploadUrl: "https://api.cloudinary.com/v1_1/demo/image/upload",
        apiKey: "chave-publica",
        timestamp: 1700000000,
        signature: "assinatura-de-teste",
        allowedFormats: ["jpg", "jpeg"],
    };
}

function buildJpeg(name = "fachada.jpg") {
    return new File(["conteudo"], name, { type: "image/jpeg" });
}

function mockApi(handlers) {
    apiFetch.mockImplementation(async (path, options = {}) => {
        const key = `${options.method ?? "GET"} ${path}`;
        const handler = handlers[key];
        if (!handler) {
            throw new Error(`Unexpected request ${key}`);
        }
        return handler(options);
    });
}

function findCalls(method, path) {
    return apiFetch.mock.calls.filter(
        ([calledPath, options = {}]) =>
            calledPath === path && (options.method ?? "GET") === method,
    );
}

function renderGallery({
    scope = MEDIA_SCOPES.HOTEL,
    targetId = HOTEL_ID,
    images = [buildImage(0), buildImage(1)],
    isEditable = true,
} = {}) {
    return renderWithUser(
        <MediaGallery
            scope={scope}
            targetId={targetId}
            images={images}
            maxBytes={MAX_BYTES}
            isEditable={isEditable}
        />,
    );
}

function getFileInput() {
    return screen.getByLabelText("Adicionar fotos", { selector: "input" });
}

function listGalleryImages() {
    return within(screen.getByRole("list", { name: "Fotos do hotel" }))
        .getAllByRole("img")
        .map((image) => image.getAttribute("alt"));
}

beforeEach(() => {
    uploadToCloudinary.mockResolvedValue({});
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("MediaGallery", () => {
    it("renders the photos by position with the cover badge", () => {
        renderGallery({
            images: [
                buildImage(1, { position: 1 }),
                buildImage(0, { position: 0 }),
            ],
        });

        expect(listGalleryImages()).toEqual([
            "Foto 1 do hotel",
            "Foto 2 do hotel",
        ]);
        expect(screen.getAllByText("Capa")).toHaveLength(1);
        expect(screen.getByText("2 de 10 fotos")).toBeInTheDocument();
        expect(
            screen.getByText(/JPG ou JPEG, até 10 MB por foto\./),
        ).toBeInTheDocument();
    });

    it("renders a read-only gallery without actions", () => {
        renderGallery({ isEditable: false });

        expect(
            screen.queryByLabelText("Adicionar fotos", { selector: "input" }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: /Remover foto/ }),
        ).not.toBeInTheDocument();
        expect(screen.getAllByRole("img")).toHaveLength(2);
    });

    it("shows the empty state", () => {
        renderGallery({ images: [], isEditable: false });

        expect(screen.getByText("Nenhuma foto")).toBeInTheDocument();
        expect(
            screen.queryByText("Adicione fotos para apresentar este espaço."),
        ).not.toBeInTheDocument();
    });

    it("invites the manager to add the first photo", () => {
        renderGallery({ images: [] });

        expect(screen.getByText("Nenhuma foto")).toBeInTheDocument();
        expect(
            screen.getByText("Adicione fotos para apresentar este espaço."),
        ).toBeInTheDocument();
        expect(screen.getByText("0 de 10 fotos")).toBeInTheDocument();
    });

    it("counts the photos of an uncapped gallery", () => {
        renderWithUser(
            <MediaGallery
                scope={MEDIA_SCOPES.UNIT}
                targetId="unit-1"
                images={[buildImage(0)]}
                maxBytes={MAX_BYTES}
                isEditable
            />,
        );

        expect(screen.getByText("1 foto")).toBeInTheDocument();
        expect(screen.getByAltText("Foto 1 da unidade")).toBeInTheDocument();
    });

    it("opens the file picker from the add button", async () => {
        const { user } = renderGallery();
        const click = vi.spyOn(HTMLInputElement.prototype, "click");

        await user.click(
            screen.getByRole("button", { name: "Adicionar fotos" }),
        );

        expect(click).toHaveBeenCalledTimes(1);
        click.mockRestore();
    });

    it("signs, uploads and registers a photo", async () => {
        const created = buildImage(2, { isCover: false });
        let finishUpload;
        uploadToCloudinary.mockImplementation(
            (signed, file, { onProgress }) =>
                new Promise((resolve) => {
                    onProgress(40);
                    finishUpload = resolve;
                }),
        );
        mockApi({
            [`POST ${SIGN_PATH}`]: () => buildSigned(),
            [`POST ${HOTEL_IMAGES_PATH}`]: () => created,
            [`GET ${HOTEL_IMAGES_PATH}`]: () => [
                buildImage(0),
                buildImage(1),
                created,
            ],
        });
        const { user } = renderGallery();
        const file = buildJpeg();

        await user.upload(getFileInput(), file);

        await waitFor(() => {
            expect(
                screen.getByRole("progressbar", {
                    name: "Enviando fachada.jpg",
                }),
            ).toHaveAttribute("aria-valuenow", "40");
        });
        expect(getFileInput()).toBeDisabled();
        finishUpload({});

        await waitFor(() => {
            expect(listGalleryImages()).toHaveLength(3);
        });
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
        expect(findCalls("POST", SIGN_PATH)[0][1].body).toEqual({
            scope: MEDIA_SCOPES.HOTEL,
            targetId: HOTEL_ID,
            fileName: "fachada.jpg",
            mimeType: "image/jpeg",
            bytes: file.size,
        });
        expect(uploadToCloudinary).toHaveBeenCalledWith(
            buildSigned(),
            file,
            expect.objectContaining({ onProgress: expect.any(Function) }),
        );
        expect(findCalls("POST", HOTEL_IMAGES_PATH)[0][1].body).toEqual({
            assetId: "asset-1",
        });
        expect(toast.success).toHaveBeenCalledWith("Foto adicionada.");
        expect(toast.error).not.toHaveBeenCalled();
    });

    it("uploads several photos one at a time", async () => {
        let signCount = 0;
        mockApi({
            [`POST ${SIGN_PATH}`]: () => {
                signCount += 1;
                return buildSigned(`asset-${signCount}`);
            },
            [`POST ${HOTEL_IMAGES_PATH}`]: () => ({}),
            [`GET ${HOTEL_IMAGES_PATH}`]: () => [
                buildImage(0),
                buildImage(1),
                buildImage(2),
                buildImage(3),
            ],
        });
        const { user } = renderGallery();

        await user.upload(getFileInput(), [
            buildJpeg("a.jpg"),
            buildJpeg("b.jpg"),
        ]);

        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith("2 fotos adicionadas.");
        });
        expect(
            findCalls("POST", HOTEL_IMAGES_PATH).map(
                ([, options]) => options.body.assetId,
            ),
        ).toEqual(["asset-1", "asset-2"]);
        expect(listGalleryImages()).toHaveLength(4);
    });

    it("drops the item when the Cloudinary upload fails", async () => {
        uploadToCloudinary.mockRejectedValue(new CloudinaryUploadError(400));
        mockApi({ [`POST ${SIGN_PATH}`]: () => buildSigned() });
        const { user } = renderGallery();

        await user.upload(getFileInput(), buildJpeg());

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                `fachada.jpg: ${CLOUDINARY_UPLOAD_FAILED_MESSAGE}`,
            );
        });
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
        expect(listGalleryImages()).toHaveLength(2);
        expect(findCalls("POST", HOTEL_IMAGES_PATH)).toHaveLength(0);
        expect(apiFetch).toHaveBeenCalledTimes(1);
        expect(toast.success).not.toHaveBeenCalled();
        expect(getFileInput()).toBeEnabled();
    });

    it("discards the uploaded asset when the registration fails", async () => {
        const assetPath = `/api/media/asset-1?scope=HOTEL&targetId=${HOTEL_ID}`;
        mockApi({
            [`POST ${SIGN_PATH}`]: () => buildSigned(),
            [`POST ${HOTEL_IMAGES_PATH}`]: () => {
                throw new ApiError({
                    code: ERROR_CODES.HOTEL_IMAGE_LIMIT_REACHED,
                    message: "O hotel já tem 10 fotos.",
                    status: 409,
                });
            },
            [`DELETE ${assetPath}`]: () => ({ assetId: "asset-1" }),
        });
        const { user } = renderGallery();

        await user.upload(getFileInput(), buildJpeg());

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                "fachada.jpg: O hotel já tem 10 fotos.",
            );
        });
        expect(findCalls("DELETE", assetPath)).toHaveLength(1);
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
        expect(listGalleryImages()).toHaveLength(2);
        expect(findCalls("GET", HOTEL_IMAGES_PATH)).toHaveLength(0);
    });

    it("ignores a failed cleanup of the uploaded asset", async () => {
        mockApi({
            [`POST ${SIGN_PATH}`]: () => buildSigned(),
            [`POST ${HOTEL_IMAGES_PATH}`]: () => {
                throw new ApiError({
                    code: ERROR_CODES.MEDIA_NOT_FOUND,
                    message: "Mídia não encontrada.",
                    status: 404,
                });
            },
        });
        const { user } = renderGallery();

        await user.upload(getFileInput(), buildJpeg());

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                "fachada.jpg: Mídia não encontrada.",
            );
        });
        expect(toast.error).toHaveBeenCalledTimes(1);
        expect(listGalleryImages()).toHaveLength(2);
    });

    it("stops before uploading when the signature is refused", async () => {
        mockApi({
            [`POST ${SIGN_PATH}`]: () => {
                throw new ApiError({
                    code: ERROR_CODES.INVALID_HOTEL_STATUS,
                    message: "O hotel não pode ser editado.",
                    status: 409,
                });
            },
        });
        const { user } = renderGallery();

        await user.upload(getFileInput(), buildJpeg());

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                "fachada.jpg: O hotel não pode ser editado.",
            );
        });
        expect(uploadToCloudinary).not.toHaveBeenCalled();
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("validates the format and the size before signing", () => {
        renderGallery();
        const png = new File(["conteudo"], "planta.png", { type: "image/png" });
        const large = buildJpeg("grande.jpg");
        Object.defineProperty(large, "size", { value: MAX_BYTES + 1 });

        fireEvent.change(getFileInput(), { target: { files: [png, large] } });

        expect(toast.error).toHaveBeenCalledWith(
            "planta.png: Envie uma foto em JPG ou JPEG.",
        );
        expect(toast.error).toHaveBeenCalledWith(
            "grande.jpg: A foto deve ter no máximo 10 MB.",
        );
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("ignores an empty selection", () => {
        renderGallery();

        fireEvent.change(getFileInput(), { target: { files: [] } });

        expect(apiFetch).not.toHaveBeenCalled();
        expect(toast.error).not.toHaveBeenCalled();
    });

    it("refuses the 11th hotel photo", async () => {
        const nineImages = Array.from({ length: 9 }, (_, index) =>
            buildImage(index),
        );
        mockApi({
            [`POST ${SIGN_PATH}`]: () => buildSigned(),
            [`POST ${HOTEL_IMAGES_PATH}`]: () => ({}),
            [`GET ${HOTEL_IMAGES_PATH}`]: () => [...nineImages, buildImage(9)],
        });
        const { user } = renderGallery({ images: nineImages });

        await user.upload(getFileInput(), [
            buildJpeg("decima.jpg"),
            buildJpeg("decima-primeira.jpg"),
        ]);

        expect(toast.error).toHaveBeenCalledWith(
            "A galeria do hotel aceita no máximo 10 fotos.",
        );
        await waitFor(() => {
            expect(screen.getByText("10 de 10 fotos")).toBeInTheDocument();
        });
        expect(findCalls("POST", SIGN_PATH)).toHaveLength(1);
        expect(getFileInput()).toBeDisabled();
        expect(
            screen.getByRole("button", { name: "Adicionar fotos" }),
        ).toBeDisabled();
    });

    it("refuses any upload to a full hotel gallery", () => {
        renderGallery({
            images: Array.from({ length: 10 }, (_, index) => buildImage(index)),
        });

        fireEvent.change(getFileInput(), {
            target: { files: [buildJpeg()] },
        });

        expect(toast.error).toHaveBeenCalledWith(
            "A galeria do hotel aceita no máximo 10 fotos.",
        );
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("keeps a single cover when another photo becomes cover", async () => {
        const imagePath = `${HOTEL_IMAGES_PATH}/image-1`;
        mockApi({
            [`PATCH ${imagePath}`]: () => buildImage(1, { isCover: true }),
            [`GET ${HOTEL_IMAGES_PATH}`]: () => [
                buildImage(0, { isCover: false }),
                buildImage(1, { isCover: true }),
            ],
        });
        const { user } = renderGallery();

        expect(
            screen.queryByRole("button", { name: "Definir foto 1 como capa" }),
        ).not.toBeInTheDocument();
        await user.click(
            screen.getByRole("button", { name: "Definir foto 2 como capa" }),
        );

        await waitFor(() => {
            expect(
                screen.getByRole("button", {
                    name: "Definir foto 1 como capa",
                }),
            ).toBeInTheDocument();
        });
        expect(screen.getAllByText("Capa")).toHaveLength(1);
        expect(findCalls("PATCH", imagePath)[0][1].body).toEqual({
            isCover: true,
        });
        expect(toast.success).toHaveBeenCalledWith("Capa atualizada.");
    });

    it("moves a photo down and up", async () => {
        mockApi({
            [`PATCH ${HOTEL_IMAGES_PATH}/image-0`]: () => ({}),
            [`PATCH ${HOTEL_IMAGES_PATH}/image-1`]: () => ({}),
            [`GET ${HOTEL_IMAGES_PATH}`]: () => [
                buildImage(1, { position: 0 }),
                buildImage(0, { position: 1 }),
            ],
        });
        const { user } = renderGallery();

        expect(
            screen.getByRole("button", { name: "Mover foto 1 para cima" }),
        ).toBeDisabled();
        expect(
            screen.getByRole("button", { name: "Mover foto 2 para baixo" }),
        ).toBeDisabled();

        await user.click(
            screen.getByRole("button", { name: "Mover foto 1 para baixo" }),
        );
        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith(
                "Ordem das fotos atualizada.",
            );
        });
        expect(
            findCalls("PATCH", `${HOTEL_IMAGES_PATH}/image-0`)[0][1].body,
        ).toEqual({ position: 1 });

        await user.click(
            screen.getByRole("button", { name: "Mover foto 2 para cima" }),
        );
        await waitFor(() => {
            expect(
                findCalls("PATCH", `${HOTEL_IMAGES_PATH}/image-0`),
            ).toHaveLength(2);
        });
        expect(
            findCalls("PATCH", `${HOTEL_IMAGES_PATH}/image-0`)[1][1].body,
        ).toEqual({ position: 0 });
    });

    it("shows the error of a refused update", async () => {
        mockApi({
            [`PATCH ${HOTEL_IMAGES_PATH}/image-1`]: () => {
                throw new ApiError({
                    code: ERROR_CODES.INVALID_HOTEL_STATUS,
                    message: "O hotel não pode ser editado.",
                    status: 409,
                });
            },
        });
        const { user } = renderGallery();

        await user.click(
            screen.getByRole("button", { name: "Definir foto 2 como capa" }),
        );

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                "O hotel não pode ser editado.",
            );
        });
        expect(
            screen.getByRole("button", { name: "Definir foto 2 como capa" }),
        ).toBeEnabled();
    });

    it("shows the error when reloading the photos fails", async () => {
        mockApi({
            [`PATCH ${HOTEL_IMAGES_PATH}/image-1`]: () => ({}),
            [`GET ${HOTEL_IMAGES_PATH}`]: () => {
                throw new ApiError({
                    code: ERROR_CODES.INTERNAL_ERROR,
                    status: 500,
                });
            },
        });
        const { user } = renderGallery();

        await user.click(
            screen.getByRole("button", { name: "Definir foto 2 como capa" }),
        );

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledTimes(1);
        });
        expect(listGalleryImages()).toHaveLength(2);
    });

    it("removes a photo after confirmation", async () => {
        const imagePath = `${HOTEL_IMAGES_PATH}/image-0`;
        mockApi({
            [`DELETE ${imagePath}`]: () => ({ id: "image-0", removed: true }),
            [`GET ${HOTEL_IMAGES_PATH}`]: () => [
                buildImage(1, { position: 0, isCover: true }),
            ],
        });
        const { user } = renderGallery();

        await user.click(
            screen.getByRole("button", { name: "Remover foto 1" }),
        );
        const dialog = screen.getByRole("dialog", { name: "Remover foto?" });
        await user.click(
            within(dialog).getByRole("button", { name: "Remover" }),
        );

        await waitFor(() => {
            expect(
                screen.queryByRole("dialog", { name: "Remover foto?" }),
            ).not.toBeInTheDocument();
        });
        expect(listGalleryImages()).toEqual(["Foto 1 do hotel"]);
        expect(screen.getAllByText("Capa")).toHaveLength(1);
        expect(findCalls("DELETE", imagePath)).toHaveLength(1);
        expect(toast.success).toHaveBeenCalledWith("Foto removida.");
    });

    it("keeps the photo when the removal is cancelled", async () => {
        const { user } = renderGallery();

        await user.click(
            screen.getByRole("button", { name: "Remover foto 2" }),
        );
        await user.click(screen.getByRole("button", { name: "Cancelar" }));

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it("keeps the dialog open when the removal fails", async () => {
        mockApi({
            [`DELETE ${HOTEL_IMAGES_PATH}/image-1`]: () => {
                throw new ApiError({
                    code: ERROR_CODES.INVALID_HOTEL_STATUS,
                    message: "O hotel não pode ser editado.",
                    status: 409,
                });
            },
        });
        const { user } = renderGallery();

        await user.click(
            screen.getByRole("button", { name: "Remover foto 2" }),
        );
        await user.click(screen.getByRole("button", { name: "Remover" }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                "O hotel não pode ser editado.",
            );
        });
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(listGalleryImages()).toHaveLength(2);
    });

    it("has no cover in the room type gallery", () => {
        renderWithUser(
            <MediaGallery
                scope={MEDIA_SCOPES.ROOM_TYPE}
                targetId={ROOM_TYPE_ID}
                images={[buildImage(0, { isCover: false }), buildImage(1)]}
                maxBytes={MAX_BYTES}
                isEditable
            />,
        );

        expect(screen.queryByText("Capa")).not.toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: /como capa/ }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByText(/A primeira foto vira capa/),
        ).not.toBeInTheDocument();
        expect(
            screen.getByAltText("Foto 1 do tipo de acomodação"),
        ).toBeInTheDocument();
    });
});
