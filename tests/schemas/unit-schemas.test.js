import { describe, expect, it } from "vitest";
import {
    createUnitSchema,
    unitParamsSchema,
    updateUnitSchema,
} from "../../src/schemas/unit-schemas.js";

const UUID = "3f1c2a4e-8b7d-4c6a-9e21-5d0b7a1c9f33";

const VALID_ADDRESS = Object.freeze({
    zipCode: "01310-100",
    street: "Avenida Paulista",
    number: "1000",
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "sp",
});

const VALID_UNIT = Object.freeze({
    name: "Unidade Paulista",
    email: "Paulista@MarAzul.example.com",
    checkInTime: "14:00",
    checkOutTime: "12:00",
    address: VALID_ADDRESS,
    phones: ["(11) 91234-5678"],
});

function issueMessage(schema, input) {
    const result = schema.safeParse(input);
    expect(result.success).toBe(false);
    return result.error.issues[0].message;
}

describe("createUnitSchema", () => {
    it("normalizes the unit data", () => {
        const result = createUnitSchema.parse(VALID_UNIT);

        expect(result).toEqual({
            name: "Unidade Paulista",
            email: "paulista@marazul.example.com",
            checkInTime: "14:00",
            checkOutTime: "12:00",
            overbookingPercentage: 0,
            address: {
                zipCode: "01310100",
                street: "Avenida Paulista",
                number: "1000",
                neighborhood: "Bela Vista",
                city: "São Paulo",
                state: "SP",
            },
            phones: ["11912345678"],
        });
    });

    it.each([0, 5, 10])("accepts an overbooking of %s%% (RN048)", (value) => {
        const result = createUnitSchema.parse({
            ...VALID_UNIT,
            overbookingPercentage: value,
        });

        expect(result.overbookingPercentage).toBe(value);
    });

    it.each([-1, 11, 100])(
        "rejects an overbooking of %s%% (RN047)",
        (value) => {
            const message = issueMessage(createUnitSchema, {
                ...VALID_UNIT,
                overbookingPercentage: value,
            });

            expect(message).toMatch(/overbooking/);
        },
    );

    it.each([2.5, "5", null])(
        "rejects a non-integer overbooking %s",
        (value) => {
            expect(
                createUnitSchema.safeParse({
                    ...VALID_UNIT,
                    overbookingPercentage: value,
                }).success,
            ).toBe(false);
        },
    );

    it("ignores latitude and longitude sent by the client (RN088)", () => {
        const result = createUnitSchema.parse({
            ...VALID_UNIT,
            address: { ...VALID_ADDRESS, latitude: 10, longitude: 20 },
            latitude: 1,
        });

        expect(result.address).not.toHaveProperty("latitude");
        expect(result.address).not.toHaveProperty("longitude");
        expect(result).not.toHaveProperty("latitude");
    });

    it("turns an empty complement into null", () => {
        const result = createUnitSchema.parse({
            ...VALID_UNIT,
            address: { ...VALID_ADDRESS, complement: "  " },
        });

        expect(result.address.complement).toBeNull();
    });

    it.each(["25:00", "7:00", "noon"])(
        "rejects the check-in time %s",
        (value) => {
            expect(
                createUnitSchema.safeParse({
                    ...VALID_UNIT,
                    checkInTime: value,
                }).success,
            ).toBe(false);
        },
    );

    it("rejects an invalid state", () => {
        expect(
            issueMessage(createUnitSchema, {
                ...VALID_UNIT,
                address: { ...VALID_ADDRESS, state: "XX" },
            }),
        ).toBe("UF inválida.");
    });

    it("rejects an invalid zip code", () => {
        expect(
            issueMessage(createUnitSchema, {
                ...VALID_UNIT,
                address: { ...VALID_ADDRESS, zipCode: "123" },
            }),
        ).toBe("CEP inválido.");
    });

    it("requires at least one phone", () => {
        expect(
            issueMessage(createUnitSchema, { ...VALID_UNIT, phones: [] }),
        ).toMatch(/ao menos 1 telefone/);
    });

    it("accepts at most five phones", () => {
        const phones = [1, 2, 3, 4, 5, 6].map((n) => `(11) 9123${n}-5678`);

        expect(
            issueMessage(createUnitSchema, { ...VALID_UNIT, phones }),
        ).toMatch(/no máximo 5/);
    });

    it("rejects repeated phones after normalization", () => {
        expect(
            issueMessage(createUnitSchema, {
                ...VALID_UNIT,
                phones: ["(11) 91234-5678", "11912345678"],
            }),
        ).toBe("Há telefones repetidos.");
    });

    it("rejects an invalid phone", () => {
        expect(
            issueMessage(createUnitSchema, { ...VALID_UNIT, phones: ["123"] }),
        ).toBe("Telefone inválido.");
    });

    it("requires the address", () => {
        const withoutAddress = { ...VALID_UNIT };
        delete withoutAddress.address;

        expect(issueMessage(createUnitSchema, withoutAddress)).toBe(
            "Envie o endereço da unidade.",
        );
    });
});

describe("updateUnitSchema", () => {
    it("accepts a partial change", () => {
        expect(updateUnitSchema.parse({ name: "Novo nome" })).toEqual({
            name: "Novo nome",
        });
    });

    it("rejects an empty change", () => {
        expect(issueMessage(updateUnitSchema, {})).toBe(
            "Informe ao menos um campo para atualizar.",
        );
    });

    it("validates the overbooking ceiling on update too", () => {
        expect(
            updateUnitSchema.safeParse({ overbookingPercentage: 11 }).success,
        ).toBe(false);
        expect(
            updateUnitSchema.safeParse({ overbookingPercentage: 0 }).success,
        ).toBe(true);
    });

    it("accepts the deactivation and refuses the reactivation", () => {
        expect(updateUnitSchema.parse({ isActive: false })).toEqual({
            isActive: false,
        });
        expect(updateUnitSchema.safeParse({ isActive: true }).success).toBe(
            false,
        );
    });

    it("requires the whole address when it is sent", () => {
        expect(
            updateUnitSchema.safeParse({ address: { city: "Santos" } }).success,
        ).toBe(false);
    });
});

describe("params schemas", () => {
    it("accepts UUIDs and rejects anything else", () => {
        expect(unitParamsSchema.safeParse({ id: UUID }).success).toBe(true);
        expect(unitParamsSchema.safeParse({ id: "1" }).success).toBe(false);
    });
});
