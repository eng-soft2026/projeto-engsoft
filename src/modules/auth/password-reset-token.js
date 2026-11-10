import { createHash, randomBytes } from "node:crypto";
import { PASSWORD_RESET_TOKEN_BYTES } from "../../constants/password-reset.js";

export function generatePasswordResetToken() {
    return randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("base64url");
}

export function hashPasswordResetToken(token) {
    return createHash("sha256").update(token).digest("hex");
}
