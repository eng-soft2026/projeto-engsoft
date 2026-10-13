import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ValidationError } from "../../src/lib/errors.js";
import { parseRouteParams } from "../../src/lib/route-params.js";

const paramsSchema = z.object({
    id: z.uuid({ error: "Identificador inválido." }),
});

const ID = "3f1c2a4e-8b7d-4c6a-9e21-5d0b7a1c9f33";

describe("parseRouteParams", () => {
    it("awaits the params promise of the route context and validates it", async () => {
        const context = { params: Promise.resolve({ id: ID }) };

        await expect(parseRouteParams(context, paramsSchema)).resolves.toEqual({
            id: ID,
        });
    });

    it("throws a ValidationError for invalid params", async () => {
        const context = { params: Promise.resolve({ id: "hotel-1" }) };

        const parse = parseRouteParams(context, paramsSchema);

        await expect(parse).rejects.toThrow(ValidationError);
        await expect(parse).rejects.toThrow("Identificador inválido.");
    });
});
