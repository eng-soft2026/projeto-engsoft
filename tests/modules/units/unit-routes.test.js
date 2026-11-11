import { describe, expect, it } from "vitest";
import {
    buildNewUnitHref,
    buildUnitHref,
    buildUnitsHref,
} from "../../../src/modules/units/unit-routes.js";

describe("unit routes", () => {
    it("builds the hotel units list href", () => {
        expect(buildUnitsHref("hotel-1")).toBe("/manager/hotels/hotel-1/units");
        expect(buildUnitsHref("hotel-1", 2)).toBe(
            "/manager/hotels/hotel-1/units?page=2",
        );
    });

    it("builds the create and edit hrefs", () => {
        expect(buildNewUnitHref("hotel-1")).toBe(
            "/manager/hotels/hotel-1/units/new",
        );
        expect(buildUnitHref("hotel-1", "unit-1")).toBe(
            "/manager/hotels/hotel-1/units/unit-1",
        );
    });
});
