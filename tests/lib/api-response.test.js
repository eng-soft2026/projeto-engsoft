import { describe, expect, it } from "vitest";
import { errorResponse, successResponse } from "../../src/lib/api-response.js";

describe("successResponse", () => {
    it("wraps data in the success envelope", () => {
        expect(successResponse({ id: 1 })).toEqual({
            success: true,
            data: { id: 1 },
        });
    });

    it("keeps an empty object as data", () => {
        expect(successResponse({})).toEqual({ success: true, data: {} });
    });
});

describe("errorResponse", () => {
    it("wraps code and message in the error envelope", () => {
        const message =
            "A acomodação não está disponível no período selecionado.";

        expect(errorResponse("ROOM_NOT_AVAILABLE", message)).toEqual({
            success: false,
            error: { code: "ROOM_NOT_AVAILABLE", message },
        });
    });

    it("does not include a data field", () => {
        expect(errorResponse("FORBIDDEN", "Acesso negado.")).not.toHaveProperty(
            "data",
        );
    });
});
