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
});
