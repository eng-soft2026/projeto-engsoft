import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ValidationError } from "../../src/lib/errors.js";
import { parseWithSchema } from "../../src/lib/validation.js";

const schema = z.object({
    name: z.string({ error: "Informe o nome." }).trim(),
    code: z
        .string({ error: "Informe o código." })
        .refine((value) => value === "ok", {
            error: "Código inválido.",
            params: { errorCode: "INVALID_CPF" },
        }),
});

describe("parseWithSchema", () => {
    it("returns the parsed data", () => {
        expect(parseWithSchema(schema, { name: " Ana ", code: "ok" })).toEqual({
            name: "Ana",
            code: "ok",
        });
    });

    it("throws a ValidationError with the first issue message", () => {
        const parse = () => parseWithSchema(schema, {});

        expect(parse).toThrow(ValidationError);
        expect(parse).toThrow("Informe o nome.");
    });

    it("uses VALIDATION_ERROR when the issue has no specific code", () => {
        try {
            parseWithSchema(schema, { code: "ok" });
        } catch (error) {
            expect(error.code).toBe("VALIDATION_ERROR");
        }
        expect.assertions(1);
    });

    it("uses the error code carried by the issue params", () => {
        try {
            parseWithSchema(schema, { name: "Ana", code: "bad" });
        } catch (error) {
            expect(error.code).toBe("INVALID_CPF");
            expect(error.message).toBe("Código inválido.");
        }
        expect.assertions(2);
    });
});
