const SUCCESS_STATUS_MIN = 200;
const SUCCESS_STATUS_MAX = 299;
const FULL_PROGRESS = 100;

export const CLOUDINARY_UPLOAD_FAILED_MESSAGE =
    "Não foi possível enviar a foto. Tente novamente.";

export class CloudinaryUploadError extends Error {
    constructor(status = 0) {
        super(CLOUDINARY_UPLOAD_FAILED_MESSAGE);
        this.name = "CloudinaryUploadError";
        this.status = status;
    }
}

export function buildCloudinaryFormData(signed, file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", signed.apiKey);
    formData.append("timestamp", String(signed.timestamp));
    formData.append("signature", signed.signature);
    formData.append("public_id", signed.publicId);
    formData.append("allowed_formats", signed.allowedFormats.join(","));
    return formData;
}

function readJson(text) {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function isSuccessStatus(status) {
    return status >= SUCCESS_STATUS_MIN && status <= SUCCESS_STATUS_MAX;
}

function createBrowserRequest() {
    return new XMLHttpRequest();
}

export function uploadToCloudinary(
    signed,
    file,
    { onProgress = () => {}, createRequest = createBrowserRequest } = {},
) {
    return new Promise((resolve, reject) => {
        const request = createRequest();
        request.open("POST", signed.uploadUrl);

        request.upload.addEventListener("progress", (event) => {
            if (!event.lengthComputable || event.total <= 0) {
                return;
            }
            onProgress(
                Math.round((event.loaded / event.total) * FULL_PROGRESS),
            );
        });
        request.addEventListener("load", () => {
            if (!isSuccessStatus(request.status)) {
                reject(new CloudinaryUploadError(request.status));
                return;
            }
            onProgress(FULL_PROGRESS);
            resolve(readJson(request.responseText));
        });
        request.addEventListener("error", () => {
            reject(new CloudinaryUploadError());
        });
        request.addEventListener("abort", () => {
            reject(new CloudinaryUploadError());
        });

        request.send(buildCloudinaryFormData(signed, file));
    });
}
