import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createCloudinaryGateway } from "../../../src/modules/media/cloudinary-gateway.js";

const CONFIG = Object.freeze({
    cloudName: "demo-cloud",
    apiKey: "chave-publica",
    apiSecret: "segredo-de-teste",
});

const UPLOAD = Object.freeze({
    publicId: "hotels/h1/a1",
    allowedFormats: ["jpg", "jpeg"],
    resourceType: "image",
    timestamp: 1_700_000_000,
});

function expectedSignature() {
    const toSign =
        "allowed_formats=jpg,jpeg&public_id=hotels/h1/a1&timestamp=1700000000";
    return createHash("sha1")
        .update(toSign + CONFIG.apiSecret)
        .digest("hex");
}

describe("cloudinaryGateway", () => {
    it("signs the sorted upload parameters with the API secret", () => {
        const gateway = createCloudinaryGateway({ getConfig: () => CONFIG });

        const signed = gateway.signUpload(UPLOAD);

        expect(signed).toEqual({
            signature: expectedSignature(),
            apiKey: "chave-publica",
            cloudName: "demo-cloud",
            uploadUrl:
                "https://api.cloudinary.com/v1_1/demo-cloud/image/upload",
        });
        expect(JSON.stringify(signed)).not.toContain(CONFIG.apiSecret);
    });

    it("refuses to sign without the configuration", () => {
        const gateway = createCloudinaryGateway({
            getConfig: () => ({ ...CONFIG, apiSecret: "" }),
        });

        expect(() => gateway.signUpload(UPLOAD)).toThrow(
            "Cloudinary is not configured",
        );
    });

    it("destroys an asset with CDN invalidation and returns the result", async () => {
        const destroy = vi.fn().mockResolvedValue({ result: "ok" });
        const gateway = createCloudinaryGateway({
            getConfig: () => CONFIG,
            sdk: { uploader: { destroy } },
        });

        const result = await gateway.destroy({
            publicId: "hotels/h1/a1",
            resourceType: "image",
        });

        expect(result).toBe("ok");
        expect(destroy).toHaveBeenCalledWith("hotels/h1/a1", {
            resource_type: "image",
            invalidate: true,
            cloud_name: "demo-cloud",
            api_key: "chave-publica",
            api_secret: "segredo-de-teste",
        });
    });

    it("reads the real metadata of an uploaded asset", async () => {
        const resource = vi.fn().mockResolvedValue({
            public_id: "hotels/h1/a1",
            format: "jpg",
            bytes: 2048,
            width: 1600,
            height: 900,
            secure_url:
                "https://res.cloudinary.com/demo-cloud/image/upload/hotels/h1/a1.jpg",
            resource_type: "image",
        });
        const gateway = createCloudinaryGateway({
            getConfig: () => CONFIG,
            sdk: { api: { resource } },
        });

        const result = await gateway.getResource({
            publicId: "hotels/h1/a1",
            resourceType: "image",
        });

        expect(result).toEqual({
            publicId: "hotels/h1/a1",
            format: "jpg",
            bytes: 2048,
            width: 1600,
            height: 900,
            secureUrl:
                "https://res.cloudinary.com/demo-cloud/image/upload/hotels/h1/a1.jpg",
        });
        expect(resource).toHaveBeenCalledWith("hotels/h1/a1", {
            resource_type: "image",
            cloud_name: "demo-cloud",
            api_key: "chave-publica",
            api_secret: "segredo-de-teste",
        });
    });

    it("returns null for an asset that does not exist", async () => {
        const resource = vi.fn().mockRejectedValue({
            error: { message: "Resource not found", http_code: 404 },
        });
        const gateway = createCloudinaryGateway({
            getConfig: () => CONFIG,
            sdk: { api: { resource } },
        });

        await expect(
            gateway.getResource({
                publicId: "hotels/h1/a1",
                resourceType: "image",
            }),
        ).resolves.toBeNull();
    });

    it("hides the SDK rejection, which may carry the credentials", async () => {
        const resource = vi.fn().mockRejectedValue({
            request_options: { auth: "chave-publica:segredo-de-teste" },
            error: { message: "Rate limited", http_code: 420 },
        });
        const gateway = createCloudinaryGateway({
            getConfig: () => CONFIG,
            sdk: { api: { resource } },
        });

        const error = await gateway
            .getResource({ publicId: "hotels/h1/a1", resourceType: "image" })
            .catch((reason) => reason);

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe(
            "Cloudinary resource lookup failed with status 420",
        );
        expect(error.cause).toBeUndefined();
    });
});
