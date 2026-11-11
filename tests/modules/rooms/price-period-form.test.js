import { describe, expect, it } from "vitest";
import {
    createPricePeriodFormSchema,
    hasPricePeriodStarted,
    toPricePeriodFormValues,
} from "../../../src/modules/rooms/price-period-form.js";

const TODAY = "2026-12-10";

function readIssues(values) {
    const result = createPricePeriodFormSchema(TODAY).safeParse(values);
    if (result.success) {
        return {};
    }
    const issues = {};
    for (const issue of result.error.issues) {
        issues[issue.path[0]] ??= issue.message;
    }
    return issues;
}

describe("price period form", () => {
    it("normalizes the price to a two-decimal string", () => {
        const result = createPricePeriodFormSchema(TODAY).parse({
            startDate: "2026-12-10",
            endDate: "2026-12-10",
            price: " 480,5 ",
        });

        expect(result).toEqual({
            startDate: "2026-12-10",
            endDate: "2026-12-10",
            price: "480.50",
        });
    });

    it("requires both dates and a valid calendar date", () => {
        expect(
            readIssues({ startDate: "", endDate: "2026-02-30", price: "100" }),
        ).toEqual({
            startDate: "Informe a data inicial.",
            endDate: "Data final inválida.",
        });
    });

    it("refuses an end date before the start date", () => {
        expect(
            readIssues({
                startDate: "2026-12-20",
                endDate: "2026-12-19",
                price: "100",
            }),
        ).toEqual({
            endDate: "A data final deve ser igual ou posterior à inicial.",
        });
    });

    it("refuses a start date before today", () => {
        expect(
            readIssues({
                startDate: "2026-12-09",
                endDate: "2026-12-20",
                price: "100",
            }),
        ).toEqual({
            startDate: "A data inicial não pode ser anterior a hoje.",
        });
    });

    it("refuses a non-positive or malformed price", () => {
        for (const price of ["0", "-1", "10,999", "abc"]) {
            expect(
                readIssues({
                    startDate: "2026-12-10",
                    endDate: "2026-12-11",
                    price,
                }),
            ).toHaveProperty("price");
        }
    });

    it("fills the form with the price using a decimal comma", () => {
        expect(
            toPricePeriodFormValues({
                id: "period-1",
                startDate: "2026-12-20",
                endDate: "2026-12-31",
                price: "480.50",
            }),
        ).toEqual({
            startDate: "2026-12-20",
            endDate: "2026-12-31",
            price: "480,50",
        });
    });

    it("treats a period as started only before today", () => {
        expect(hasPricePeriodStarted({ startDate: "2026-12-09" }, TODAY)).toBe(
            true,
        );
        expect(hasPricePeriodStarted({ startDate: TODAY }, TODAY)).toBe(false);
    });
});
