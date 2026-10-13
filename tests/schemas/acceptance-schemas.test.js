import { describe, expect, it } from "vitest";
import { replaceAcceptancesSchema } from "../../src/schemas/acceptance-schemas.js";

function parse(acceptances) {
    return replaceAcceptancesSchema.safeParse({ acceptances });
}

describe("replaceAcceptancesSchema", () => {
    it("accepts a standard type without label and normalizes the optional fields", () => {
        const result = parse([{ type: "PETS", isAllowed: true }]);

        expect(result.data.acceptances).toEqual([
            { type: "PETS", customLabel: null, isAllowed: true, details: null },
        ]);
    });

    it("accepts OTHER with a trimmed label and details", () => {
        const result = parse([
            {
                type: "OTHER",
                customLabel: "  Caixas de som ",
                isAllowed: false,
                details: " Não após as 22h. ",
            },
        ]);

        expect(result.data.acceptances[0]).toEqual({
            type: "OTHER",
            customLabel: "Caixas de som",
            isAllowed: false,
            details: "Não após as 22h.",
        });
    });

    it("requires the label for OTHER (RN113)", () => {
        expect(parse([{ type: "OTHER", isAllowed: true }]).success).toBe(false);
        expect(
            parse([{ type: "OTHER", customLabel: null, isAllowed: true }])
                .success,
        ).toBe(false);
    });

    it("refuses a label on a standard type", () => {
        const result = parse([
            { type: "PETS", customLabel: "Cães", isAllowed: true },
        ]);

        expect(result.success).toBe(false);
    });

    it("refuses the same standard type twice (RN113)", () => {
        const result = parse([
            { type: "PETS", isAllowed: true },
            { type: "PETS", isAllowed: false },
        ]);

        expect(result.success).toBe(false);
    });

    it("refuses repeated OTHER labels regardless of case (RN113)", () => {
        const result = parse([
            { type: "OTHER", customLabel: "Som alto", isAllowed: true },
            { type: "OTHER", customLabel: "som ALTO", isAllowed: false },
        ]);

        expect(result.success).toBe(false);
    });

    it("accepts different OTHER labels", () => {
        const result = parse([
            { type: "OTHER", customLabel: "Som alto", isAllowed: true },
            { type: "OTHER", customLabel: "Drones", isAllowed: false },
        ]);

        expect(result.success).toBe(true);
    });

    it.each([
        [{ type: "UNKNOWN", isAllowed: true }],
        [{ type: "PETS" }],
        [{ type: "PETS", isAllowed: "yes" }],
    ])("rejects %j", (acceptance) => {
        expect(parse([acceptance]).success).toBe(false);
    });
});
