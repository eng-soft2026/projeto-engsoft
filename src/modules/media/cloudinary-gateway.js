import { v2 as cloudinary } from "cloudinary";
import {
    getCloudinaryConfig,
    isCloudinaryConfigured,
} from "../../config/cloudinary.js";

export const CLOUDINARY_UPLOAD_API_URL = "https://api.cloudinary.com/v1_1";

export const CLOUDINARY_DESTROY_RESULTS = Object.freeze({
    OK: "ok",
    NOT_FOUND: "not found",
});

export function createCloudinaryGateway({
    getConfig = getCloudinaryConfig,
    sdk = cloudinary,
} = {}) {
    function requireConfig() {
        const config = getConfig();
        if (!isCloudinaryConfigured(config)) {
            throw new Error("Cloudinary is not configured");
        }
        return config;
    }

    function signUpload({ publicId, allowedFormats, resourceType, timestamp }) {
        const config = requireConfig();
        const paramsToSign = {
            allowed_formats: allowedFormats.join(","),
            public_id: publicId,
            timestamp,
        };
        const signature = sdk.utils.api_sign_request(
            paramsToSign,
            config.apiSecret,
        );
        return Object.freeze({
            signature,
            apiKey: config.apiKey,
            cloudName: config.cloudName,
            uploadUrl: `${CLOUDINARY_UPLOAD_API_URL}/${config.cloudName}/${resourceType}/upload`,
        });
    }

    async function destroy({ publicId, resourceType }) {
        const config = requireConfig();
        const response = await sdk.uploader.destroy(publicId, {
            resource_type: resourceType,
            invalidate: true,
            cloud_name: config.cloudName,
            api_key: config.apiKey,
            api_secret: config.apiSecret,
        });
        return response?.result;
    }

    async function getResource({ publicId, resourceType }) {
        const config = requireConfig();
        try {
            const resource = await sdk.api.resource(publicId, {
                resource_type: resourceType,
                cloud_name: config.cloudName,
                api_key: config.apiKey,
                api_secret: config.apiSecret,
            });
            return Object.freeze({
                publicId: resource.public_id,
                format: resource.format,
                bytes: resource.bytes,
                width: resource.width,
                height: resource.height,
                secureUrl: resource.secure_url,
            });
        } catch (reason) {
            const httpCode = readHttpCode(reason);
            if (httpCode === HTTP_NOT_FOUND) {
                return null;
            }
            // eslint-disable-next-line preserve-caught-error -- the SDK rejection may carry the API credentials in its request options
            throw new Error(
                `Cloudinary resource lookup failed with status ${httpCode ?? "unknown"}`,
            );
        }
    }

    return Object.freeze({ signUpload, destroy, getResource });
}

const HTTP_NOT_FOUND = 404;

function readHttpCode(reason) {
    return reason?.error?.http_code ?? reason?.http_code ?? null;
}

export const cloudinaryGateway = createCloudinaryGateway();
