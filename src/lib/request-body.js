import { ValidationError } from "./errors.js";

const JSON_CONTENT_TYPE = "application/json";

function isJsonRequest(request) {
    const contentType = request.headers.get("content-type") ?? "";
    return contentType.toLowerCase().startsWith(JSON_CONTENT_TYPE);
}

export async function readJsonBody(request) {
    if (!isJsonRequest(request)) {
        throw new ValidationError("Envie os dados no formato JSON.");
    }

    try {
        return await request.json();
    } catch {
        throw new ValidationError(
            "O corpo da requisição não é um JSON válido.",
        );
    }
}
