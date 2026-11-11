export function getCloudinaryConfig(env = process.env) {
    return Object.freeze({
        cloudName: env.CLOUDINARY_CLOUD_NAME ?? "",
        apiKey: env.CLOUDINARY_API_KEY ?? "",
        apiSecret: env.CLOUDINARY_API_SECRET ?? "",
    });
}

export function isCloudinaryConfigured(config) {
    return Boolean(config.cloudName && config.apiKey && config.apiSecret);
}
