import { describe, expect, it } from "vitest";
import {
    createRoomPricePeriodSchema,
    roomPricePeriodParamsSchema,
    updateRoomPricePeriodSchema,
} from "../../src/schemas/room-price-period-schemas.js";

const VALID = Object.freeze({
    startDate: "2026-12-20",
    endDate: "2026-12-31",
    price: 450,
});

describe("createRoomPricePeriodSchema", () => {
    it("normalizes the price to a 2-place string", () => {
        expect(createRoomPricePeriodSchema.parse(VALID)).toEqual({
            startDate: "2026-12-20",
            endDate: "2026-12-31",
            price: "450.00",
        });
    });

    it("accepts a one-night period with equal dates", () => {
        const result = createRoomPricePeriodSchema.safeParse({
            ...VALID,
            endDate: VALID.startDate,
        });

        expect(result.success).toBe(true);
    });

    it.each([
        ["end before start", { endDate: "2026-12-19" }],
        ["invalid date", { startDate: "2026-02-30" }],
        ["wrong format", { startDate: "20/12/2026" }],
        ["zero price", { price: "0" }],
        ["3-place price", { price: "1.234" }],
        ["missing price", { price: undefined }],
    ])("rejects %s", (_, override) => {
        const result = createRoomPricePeriodSchema.safeParse({
            ...VALID,
            ...override,
        });

        expect(result.success).toBe(false);
    });
});

describe("updateRoomPricePeriodSchema", () => {
    it("accepts a single field", () => {
        expect(updateRoomPricePeriodSchema.parse({ price: "99.9" })).toEqual({
            price: "99.90",
        });
    });

    it("rejects an empty body and reversed dates", () => {
        expect(updateRoomPricePeriodSchema.safeParse({}).success).toBe(false);
        expect(
            updateRoomPricePeriodSchema.safeParse({
                startDate: "2026-12-20",
                endDate: "2026-12-19",
            }).success,
        ).toBe(false);
    });
});

describe("roomPricePeriodParamsSchema", () => {
    it("requires a UUID", () => {
        expect(roomPricePeriodParamsSchema.safeParse({ id: "x" }).success).toBe(
            false,
        );
    });
});
