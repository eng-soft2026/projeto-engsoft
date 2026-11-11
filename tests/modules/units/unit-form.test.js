import { describe, expect, it } from "vitest";
import {
    UNIT_FORM_DEFAULT_VALUES,
    toUnitFormValues,
    toUnitPayload,
    unitFormSchema,
} from "../../../src/modules/units/unit-form.js";

function buildFormValues(overrides = {}) {
    return {
        name: "Unidade Centro",
        email: "centro@pousada.com",
        checkInTime: "14:00",
        checkOutTime: "12:00",
        overbookingPercentage: 5,
        address: {
            zipCode: "01310-100",
            street: "Avenida Paulista",
            number: "1000",
            complement: "",
            neighborhood: "Bela Vista",
            city: "São Paulo",
            state: "sp",
        },
        phones: [{ value: "(11) 98888-7777" }, { value: "(11) 3333-4444" }],
        ...overrides,
    };
}

function collectIssuePaths(result) {
    return result.error.issues.map(({ path }) => path.join("."));
}

describe("unit form schema", () => {
    it("normalizes the masked values to the API format", () => {
        const values = unitFormSchema.parse(buildFormValues());

        expect(toUnitPayload(values)).toEqual({
            name: "Unidade Centro",
            email: "centro@pousada.com",
            checkInTime: "14:00",
            checkOutTime: "12:00",
            overbookingPercentage: 5,
            address: {
                zipCode: "01310100",
                street: "Avenida Paulista",
                number: "1000",
                complement: null,
                neighborhood: "Bela Vista",
                city: "São Paulo",
                state: "SP",
            },
            phones: ["11988887777", "1133334444"],
        });
    });

    it("never sends coordinates", () => {
        const values = unitFormSchema.parse(
            buildFormValues({
                address: {
                    ...buildFormValues().address,
                    latitude: -23.5,
                    longitude: -46.6,
                },
            }),
        );

        expect(toUnitPayload(values).address).not.toHaveProperty("latitude");
        expect(toUnitPayload(values).address).not.toHaveProperty("longitude");
    });

    it.each([0, 10])("accepts an overbooking of %i%%", (percentage) => {
        const result = unitFormSchema.safeParse(
            buildFormValues({ overbookingPercentage: percentage }),
        );

        expect(result.success).toBe(true);
    });

    it.each([-1, 11, 2.5, Number.NaN])(
        "rejects an overbooking of %s",
        (percentage) => {
            const result = unitFormSchema.safeParse(
                buildFormValues({ overbookingPercentage: percentage }),
            );

            expect(collectIssuePaths(result)).toEqual([
                "overbookingPercentage",
            ]);
        },
    );

    it.each(["", "24:00", "9:00", "14h00"])(
        "rejects the check-in time %j",
        (checkInTime) => {
            const result = unitFormSchema.safeParse(
                buildFormValues({ checkInTime }),
            );

            expect(collectIssuePaths(result)).toEqual(["checkInTime"]);
        },
    );

    it("rejects an invalid CEP and phone on their fields", () => {
        const result = unitFormSchema.safeParse(
            buildFormValues({
                address: { ...buildFormValues().address, zipCode: "0131-01" },
                phones: [{ value: "(11) 1234-5678" }],
            }),
        );

        expect(collectIssuePaths(result)).toEqual([
            "address.zipCode",
            "phones.0.value",
        ]);
    });

    it("flags a repeated phone on the duplicate entry", () => {
        const result = unitFormSchema.safeParse(
            buildFormValues({
                phones: [
                    { value: "(11) 98888-7777" },
                    { value: "11988887777" },
                ],
            }),
        );

        expect(collectIssuePaths(result)).toEqual(["phones.1.value"]);
    });

    it("requires between one and five phones", () => {
        const empty = unitFormSchema.safeParse(buildFormValues({ phones: [] }));
        const tooMany = unitFormSchema.safeParse(
            buildFormValues({
                phones: [
                    "11911111111",
                    "11922222222",
                    "11933333333",
                    "11944444444",
                    "11955555555",
                    "11966666666",
                ].map((value) => ({ value })),
            }),
        );

        expect(collectIssuePaths(empty)).toEqual(["phones"]);
        expect(collectIssuePaths(tooMany)).toEqual(["phones"]);
    });

    it("starts with one empty phone and no overbooking", () => {
        expect(UNIT_FORM_DEFAULT_VALUES.phones).toEqual([{ value: "" }]);
        expect(UNIT_FORM_DEFAULT_VALUES.overbookingPercentage).toBe(0);
    });
});

describe("toUnitFormValues", () => {
    it("masks the stored unit for the form", () => {
        const unit = {
            id: "unit-1",
            hotelId: "hotel-1",
            name: "Unidade Centro",
            email: "centro@pousada.com",
            checkInTime: "14:00",
            checkOutTime: "12:00",
            overbookingPercentage: 3,
            isActive: true,
            address: {
                zipCode: "01310100",
                street: "Avenida Paulista",
                number: "1000",
                complement: null,
                neighborhood: "Bela Vista",
                city: "São Paulo",
                state: "SP",
                latitude: null,
                longitude: null,
            },
            phones: [{ id: "phone-1", phone: "11988887777" }],
        };

        expect(toUnitFormValues(unit)).toEqual({
            name: "Unidade Centro",
            email: "centro@pousada.com",
            checkInTime: "14:00",
            checkOutTime: "12:00",
            overbookingPercentage: 3,
            address: {
                zipCode: "01310-100",
                street: "Avenida Paulista",
                number: "1000",
                complement: "",
                neighborhood: "Bela Vista",
                city: "São Paulo",
                state: "SP",
            },
            phones: [{ value: "(11) 98888-7777" }],
        });
    });
});
