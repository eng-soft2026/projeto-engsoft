import { describe, expect, it, vi } from "vitest";
import {
    CLOUDINARY_UPLOAD_FAILED_MESSAGE,
    CloudinaryUploadError,
    buildCloudinaryFormData,
    uploadToCloudinary,
} from "../../../src/modules/media/cloudinary-upload.js";

const SIGNED = Object.freeze({
    assetId: "asset-1",
    publicId: "hotels/hotel-1/asset-1",
    uploadUrl: "https://api.cloudinary.com/v1_1/demo/image/upload",
    apiKey: "chave-publica",
    timestamp: 1700000000,
    signature: "assinatura-de-teste",
    allowedFormats: ["jpg", "jpeg"],
});

function createFakeRequest() {
    const listeners = {};
    const uploadListeners = {};
    const request = {
        status: 0,
        responseText: "",
        open: vi.fn(),
        send: vi.fn(),
        addEventListener: vi.fn((name, listener) => {
            listeners[name] = listener;
        }),
        upload: {
            addEventListener: vi.fn((name, listener) => {
                uploadListeners[name] = listener;
            }),
        },
        emit(name) {
            listeners[name]();
        },
        emitProgress(event) {
            uploadListeners.progress(event);
        },
    };
    return request;
}

function startUpload(onProgress = vi.fn()) {
    const request = createFakeRequest();
    const file = new Blob(["conteudo"], { type: "image/jpeg" });
    const promise = uploadToCloudinary(SIGNED, file, {
        onProgress,
        createRequest: () => request,
    });
    return { request, promise, onProgress, file };
}

describe("buildCloudinaryFormData", () => {
    it("sends only the signed fields and the file", () => {
        const file = new Blob(["conteudo"], { type: "image/jpeg" });

        const formData = buildCloudinaryFormData(SIGNED, file);

        expect([...formData.keys()]).toEqual([
            "file",
            "api_key",
            "timestamp",
            "signature",
            "public_id",
            "allowed_formats",
        ]);
        expect(formData.get("api_key")).toBe(SIGNED.apiKey);
        expect(formData.get("timestamp")).toBe("1700000000");
        expect(formData.get("signature")).toBe(SIGNED.signature);
        expect(formData.get("public_id")).toBe(SIGNED.publicId);
        expect(formData.get("allowed_formats")).toBe("jpg,jpeg");
    });
});

describe("uploadToCloudinary", () => {
    it("posts the form to the signed upload URL", () => {
        const { request } = startUpload();

        expect(request.open).toHaveBeenCalledWith("POST", SIGNED.uploadUrl);
        expect(request.send).toHaveBeenCalledWith(expect.any(FormData));
    });

    it("reports the progress and resolves with the response", async () => {
        const { request, promise, onProgress } = startUpload();

        request.emitProgress({
            lengthComputable: true,
            loaded: 25,
            total: 100,
        });
        request.emitProgress({ lengthComputable: false, loaded: 1, total: 0 });
        request.emitProgress({ lengthComputable: true, loaded: 0, total: 0 });
        request.status = 200;
        request.responseText = JSON.stringify({ public_id: SIGNED.publicId });
        request.emit("load");

        await expect(promise).resolves.toEqual({
            public_id: SIGNED.publicId,
        });
        expect(onProgress.mock.calls).toEqual([[25], [100]]);
    });

    it("resolves with null when the response is not JSON", async () => {
        const { request, promise } = startUpload();

        request.status = 200;
        request.responseText = "ok";
        request.emit("load");

        await expect(promise).resolves.toBe(null);
    });

    it("rejects when Cloudinary refuses the upload", async () => {
        const { request, promise, onProgress } = startUpload();

        request.status = 400;
        request.emit("load");

        const error = await promise.catch((reason) => reason);
        expect(error).toBeInstanceOf(CloudinaryUploadError);
        expect(error.status).toBe(400);
        expect(error.message).toBe(CLOUDINARY_UPLOAD_FAILED_MESSAGE);
        expect(onProgress).not.toHaveBeenCalled();
    });

    it.each(["error", "abort"])("rejects on a network %s", async (name) => {
        const { request, promise } = startUpload();

        request.emit(name);

        const error = await promise.catch((reason) => reason);
        expect(error).toBeInstanceOf(CloudinaryUploadError);
        expect(error.status).toBe(0);
    });

    it("uses the browser request and a no-op progress by default", () => {
        const request = createFakeRequest();
        const RequestStub = vi.fn(function RequestStub() {
            return request;
        });
        vi.stubGlobal("XMLHttpRequest", RequestStub);

        uploadToCloudinary(SIGNED, new Blob(["conteudo"]));
        request.emitProgress({ lengthComputable: true, loaded: 1, total: 2 });

        expect(RequestStub).toHaveBeenCalledTimes(1);
        vi.unstubAllGlobals();
    });
});
