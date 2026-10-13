import { describe, expect, it } from "vitest";
import {
    createPolicySchema,
    policyParamsSchema,
    updatePolicySchema,
} from "../../src/schemas/policy-schemas.js";

const UUID = "3f1c2a4e-8b7d-4c6a-9e21-5d0b7a1c9f33";

const VALID_INPUT = Object.freeze({
    type: "QUIET_HOURS",
    title: "  Silêncio ",
    description: " Das 22h às 7h. ",
});

describe("createPolicySchema", () => {
    it("trims the text", () => {
        const result = createPolicySchema.safeParse(VALID_INPUT);

        expect(result.data).toEqual({
            type: "QUIET_HOURS",
            title: "Silêncio",
            description: "Das 22h às 7h.",
        });
    });

    it.each([
        { ...VALID_INPUT, type: "PETS" },
        { ...VALID_INPUT, title: "A" },
        { ...VALID_INPUT, description: "  " },
        { type: "OTHER" },
    ])("rejects %j", (input) => {
        expect(createPolicySchema.safeParse(input).success).toBe(false);
    });

    it("ignores isSystem sent by the client", () => {
        const result = createPolicySchema.safeParse({
            ...VALID_INPUT,
            isSystem: true,
        });

        expect(result.data).not.toHaveProperty("isSystem");
    });
});

describe("updatePolicySchema", () => {
    it("accepts a single field, including a reactivation", () => {
        expect(updatePolicySchema.safeParse({ isActive: true }).success).toBe(
            true,
        );
    });

    it("rejects an empty body", () => {
        expect(updatePolicySchema.safeParse({}).success).toBe(false);
    });
});

describe("policyParamsSchema", () => {
    it("requires a UUID", () => {
        expect(policyParamsSchema.safeParse({ id: UUID }).success).toBe(true);
        expect(policyParamsSchema.safeParse({ id: "x" }).success).toBe(false);
    });
});
