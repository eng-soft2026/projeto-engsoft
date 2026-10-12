import { describe, expect, it } from "vitest";
import { ValidationError } from "../../src/lib/errors.js";
import { readJsonBody } from "../../src/lib/request-body.js";

function createRequest(body, contentType) {
    const headers = contentType ? { "content-type": contentType } : {};
    return new Request("http://localhost/api/test", {
        method: "POST",
        headers,
        body,
    });
}

describe("readJsonBody", () => {
    it("parses a JSON body", async () => {
        const request = createRequest('{"name":"Ana"}', "application/json");

        await expect(readJsonBody(request)).resolves.toEqual({ name: "Ana" });
    });

    it("accepts a JSON content type with charset", async () => {
        const request = createRequest(
            '{"name":"Ana"}',
            "application/json; charset=utf-8",
        );

        await expect(readJsonBody(request)).resolves.toEqual({ name: "Ana" });
    });

    it("rejects a request that is not JSON", async () => {
        const request = createRequest(
            "name=Ana",
            "application/x-www-form-urlencoded",
        );

        await expect(readJsonBody(request)).rejects.toThrow(ValidationError);
    });

    it("rejects a request without content type", async () => {
        const request = createRequest("{}");
        request.headers.delete("content-type");

        await expect(readJsonBody(request)).rejects.toThrow(ValidationError);
    });

    it("rejects malformed JSON", async () => {
        const request = createRequest("{invalid", "application/json");

        await expect(readJsonBody(request)).rejects.toThrow(
            "O corpo da requisição não é um JSON válido.",
        );
    });
});
