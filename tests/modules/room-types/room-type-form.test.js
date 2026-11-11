import { describe, expect, it } from "vitest";
import { BED_TYPES } from "../../../src/constants/bed-types.js";
import {
    MAX_BED_ROWS,
    ROOM_TYPE_FORM_DEFAULT_VALUES,
    roomTypeFormSchema,
    roomTypePriceFormSchema,
    toRoomTypeFormValues,
    toRoomTypePayload,
    toRoomTypePricePayload,
} from "../../../src/modules/room-types/room-type-form.js";

function buildFormValues(overrides = {}) {
    return {
        name: "Suíte Luxo",
        description: "Suíte com vista para o mar.",
        maxGuests: 3,
        areaM2: "25,5",
        defaultPrice: "350",
        beds: [
            { bedType: BED_TYPES.DOUBLE, quantity: 1 },
            { bedType: BED_TYPES.SINGLE, quantity: 1 },
        ],
        ...overrides,
    };
}

function collectIssuePaths(result) {
    return result.error.issues.map(({ path }) => path.join("."));
}

describe("room type form schema", () => {
    it("sends money and area as strings with 2 decimal places", () => {
        const values = roomTypeFormSchema.parse(buildFormValues());

        expect(toRoomTypePayload(values)).toEqual({
            name: "Suíte Luxo",
            description: "Suíte com vista para o mar.",
            maxGuests: 3,
            areaM2: "25.50",
            defaultPrice: "350.00",
            beds: [
                { bedType: BED_TYPES.DOUBLE, quantity: 1 },
                { bedType: BED_TYPES.SINGLE, quantity: 1 },
            ],
        });
    });

    it.each([
        ["350,99", "350.99"],
        ["350.99", "350.99"],
        ["350,9", "350.90"],
        [" 1200 ", "1200.00"],
    ])("accepts %j as %j", (input, expected) => {
        const values = roomTypeFormSchema.parse(
            buildFormValues({ defaultPrice: input }),
        );

        expect(values.defaultPrice).toBe(expected);
    });

    it.each(["350,999", "350.999", "25,555"])(
        "rejects %j with 3 decimal places instead of rounding",
        (input) => {
            const result = roomTypeFormSchema.safeParse(
                buildFormValues({ defaultPrice: input, areaM2: input }),
            );

            expect(result.success).toBe(false);
            expect(collectIssuePaths(result)).toEqual([
                "areaM2",
                "defaultPrice",
            ]);
        },
    );

    it.each(["", "0", "0,00", "-10", "abc", "1.234,56", "123456789"])(
        "rejects the price %j",
        (input) => {
            const result = roomTypeFormSchema.safeParse(
                buildFormValues({ defaultPrice: input }),
            );

            expect(collectIssuePaths(result)).toEqual(["defaultPrice"]);
        },
    );

    it("rejects an area above the integer digit limit", () => {
        const result = roomTypeFormSchema.safeParse(
            buildFormValues({ areaM2: "123456" }),
        );

        expect(collectIssuePaths(result)).toEqual(["areaM2"]);
    });

    it.each([0, 51, 2.5, Number.NaN])("rejects a capacity of %s", (value) => {
        const result = roomTypeFormSchema.safeParse(
            buildFormValues({ maxGuests: value }),
        );

        expect(collectIssuePaths(result)).toEqual(["maxGuests"]);
    });

    it("flags the repeated bed type on its own row", () => {
        const result = roomTypeFormSchema.safeParse(
            buildFormValues({
                beds: [
                    { bedType: BED_TYPES.DOUBLE, quantity: 1 },
                    { bedType: BED_TYPES.DOUBLE, quantity: 2 },
                ],
            }),
        );

        expect(collectIssuePaths(result)).toEqual(["beds.1.bedType"]);
    });

    it("requires a bed type and a quantity from 1 to 10", () => {
        const result = roomTypeFormSchema.safeParse(
            buildFormValues({
                beds: [
                    { bedType: "", quantity: 1 },
                    { bedType: BED_TYPES.KING, quantity: 11 },
                ],
            }),
        );

        expect(collectIssuePaths(result)).toEqual([
            "beds.0.bedType",
            "beds.1.quantity",
        ]);
    });

    it("requires at least one bed and caps the rows by the bed types", () => {
        expect(MAX_BED_ROWS).toBe(Object.keys(BED_TYPES).length);
        expect(
            collectIssuePaths(
                roomTypeFormSchema.safeParse(buildFormValues({ beds: [] })),
            ),
        ).toEqual(["beds"]);
    });

    it("rejects the empty default values", () => {
        const result = roomTypeFormSchema.safeParse(
            ROOM_TYPE_FORM_DEFAULT_VALUES,
        );

        expect(collectIssuePaths(result)).toEqual([
            "name",
            "description",
            "areaM2",
            "defaultPrice",
            "beds.0.bedType",
        ]);
    });
});

describe("room type price form schema", () => {
    it("sends only the default price", () => {
        const values = roomTypePriceFormSchema.parse(
            buildFormValues({ defaultPrice: "410,5" }),
        );

        expect(toRoomTypePricePayload(values)).toEqual({
            defaultPrice: "410.50",
        });
    });

    it("rejects 3 decimal places", () => {
        const result = roomTypePriceFormSchema.safeParse({
            defaultPrice: "410,555",
        });

        expect(result.success).toBe(false);
    });
});

describe("toRoomTypeFormValues", () => {
    it("shows the decimals with a comma and keeps the beds", () => {
        expect(
            toRoomTypeFormValues({
                id: "type-1",
                name: "Suíte Luxo",
                description: "Suíte com vista para o mar.",
                maxGuests: 3,
                areaM2: "25.50",
                defaultPrice: "350.00",
                isActive: true,
                beds: [{ bedType: BED_TYPES.KING, quantity: 1 }],
            }),
        ).toEqual({
            name: "Suíte Luxo",
            description: "Suíte com vista para o mar.",
            maxGuests: 3,
            areaM2: "25,50",
            defaultPrice: "350,00",
            beds: [{ bedType: BED_TYPES.KING, quantity: 1 }],
        });
    });
});
