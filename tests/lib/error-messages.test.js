import { describe, expect, it } from "vitest";
import { ApiError, CLIENT_ERROR_CODES } from "../../src/lib/api-client.js";
import {
    DEFAULT_ERROR_MESSAGE,
    ERROR_MESSAGES,
    getErrorMessage,
    resolveErrorMessage,
} from "../../src/lib/error-messages.js";
import { ERROR_CODES } from "../../src/lib/errors.js";

describe("ERROR_MESSAGES", () => {
    it("has a message for every API and client error code", () => {
        const codes = [
            ...Object.values(ERROR_CODES),
            ...Object.values(CLIENT_ERROR_CODES),
        ];

        expect(Object.keys(ERROR_MESSAGES).sort()).toEqual(codes.sort());
        for (const code of codes) {
            expect(ERROR_MESSAGES[code]).toMatch(/\S/);
        }
    });
});

describe("getErrorMessage", () => {
    it("returns the message of a known code", () => {
        expect(getErrorMessage(ERROR_CODES.INVALID_CPF)).toBe("CPF inválido.");
    });

    it.each(["UNKNOWN_CODE", "constructor", undefined])(
        "falls back to the default message for %s",
        (code) => {
            expect(getErrorMessage(code)).toBe(DEFAULT_ERROR_MESSAGE);
        },
    );
});

describe("resolveErrorMessage", () => {
    it("prefers the message sent by the server", () => {
        const error = new ApiError({
            code: ERROR_CODES.VALIDATION_ERROR,
            message: "A senha deve ter pelo menos 8 caracteres.",
            status: 400,
        });

        expect(resolveErrorMessage(error)).toBe(
            "A senha deve ter pelo menos 8 caracteres.",
        );
    });

    it("uses the code message when the server sent none", () => {
        const error = new ApiError({
            code: CLIENT_ERROR_CODES.NETWORK_ERROR,
            status: 0,
        });

        expect(resolveErrorMessage(error)).toBe(
            ERROR_MESSAGES[CLIENT_ERROR_CODES.NETWORK_ERROR],
        );
    });

    it("hides the message of an error that did not come from the API", () => {
        expect(resolveErrorMessage(new TypeError("x is undefined"))).toBe(
            DEFAULT_ERROR_MESSAGE,
        );
    });
});
