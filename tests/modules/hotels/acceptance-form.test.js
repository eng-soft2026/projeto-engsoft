import { describe, expect, it } from "vitest";
import {
    ACCEPTANCE_STATUSES,
    MAX_CUSTOM_ACCEPTANCES,
    acceptanceFormSchema,
    buildAcceptanceFormValues,
    buildAcceptancesPayload,
    buildEmptyCustomAcceptance,
} from "../../../src/modules/hotels/acceptance-form.js";

const STORED_ACCEPTANCES = Object.freeze([
    {
        type: "PETS",
        customLabel: null,
        isAllowed: true,
        details: "Até 10 kg.",
    },
    { type: "SMOKING", customLabel: null, isAllowed: false, details: null },
    {
        type: "OTHER",
        customLabel: "Som alto",
        isAllowed: false,
        details: null,
    },
]);

function buildCustom(customLabel) {
    return { ...buildEmptyCustomAcceptance(), customLabel };
}

describe("buildAcceptanceFormValues", () => {
    it("fills one row per standard type and lists the custom rules", () => {
        const values = buildAcceptanceFormValues(STORED_ACCEPTANCES);

        expect(values.standard).toEqual([
            { type: "PETS", status: "ALLOWED", details: "Até 10 kg." },
            { type: "SMOKING", status: "NOT_ALLOWED", details: "" },
            { type: "CHILDREN", status: "", details: "" },
            { type: "VISITORS", status: "", details: "" },
            { type: "EVENTS", status: "", details: "" },
        ]);
        expect(values.custom).toEqual([
            { customLabel: "Som alto", status: "NOT_ALLOWED", details: "" },
        ]);
    });
});

describe("buildAcceptancesPayload", () => {
    it("sends the whole set and skips unset standard types", () => {
        const values = buildAcceptanceFormValues(STORED_ACCEPTANCES);

        expect(buildAcceptancesPayload(values)).toEqual({
            acceptances: [
                {
                    type: "PETS",
                    customLabel: null,
                    isAllowed: true,
                    details: "Até 10 kg.",
                },
                {
                    type: "SMOKING",
                    customLabel: null,
                    isAllowed: false,
                    details: null,
                },
                {
                    type: "OTHER",
                    customLabel: "Som alto",
                    isAllowed: false,
                    details: null,
                },
            ],
        });
    });
});

describe("acceptanceFormSchema", () => {
    it("requires the label of a custom rule", () => {
        const result = acceptanceFormSchema.safeParse({
            standard: [],
            custom: [buildCustom("  ")],
        });

        expect(result.success).toBe(false);
        expect(result.error.issues[0]).toMatchObject({
            path: ["custom", 0, "customLabel"],
            message: "Informe o rótulo da regra.",
        });
    });

    it("refuses custom labels repeated ignoring case (RN113)", () => {
        const result = acceptanceFormSchema.safeParse({
            standard: [],
            custom: [buildCustom("Som alto"), buildCustom("SOM ALTO ")],
        });

        expect(result.success).toBe(false);
        expect(result.error.issues).toEqual([
            expect.objectContaining({
                path: ["custom", 1, "customLabel"],
                message: "Já existe uma regra com este rótulo.",
            }),
        ]);
    });

    it("limits the number of custom rules", () => {
        const custom = Array.from(
            { length: MAX_CUSTOM_ACCEPTANCES + 1 },
            (_, index) => buildCustom(`Regra ${index}`),
        );

        const result = acceptanceFormSchema.safeParse({ standard: [], custom });

        expect(result.success).toBe(false);
    });

    it("accepts unset standard types and normalizes empty details", () => {
        const result = acceptanceFormSchema.safeParse({
            standard: [
                {
                    type: "PETS",
                    status: ACCEPTANCE_STATUSES.UNSET,
                    details: "",
                },
            ],
            custom: [buildCustom("Som alto")],
        });

        expect(result.success).toBe(true);
        expect(result.data.standard[0].details).toBeNull();
        expect(result.data.custom[0].customLabel).toBe("Som alto");
    });
});
