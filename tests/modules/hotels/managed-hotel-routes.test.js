import { describe, expect, it } from "vitest";
import {
    buildManagedHotelHref,
    isSectionActive,
    MANAGED_HOTEL_SECTIONS,
} from "../../../src/modules/hotels/managed-hotel-routes.js";

describe("managed hotel routes", () => {
    it("builds the hotel and section links", () => {
        expect(buildManagedHotelHref("hotel-1")).toBe(
            "/manager/hotels/hotel-1",
        );
        expect(buildManagedHotelHref("hotel-1", "units")).toBe(
            "/manager/hotels/hotel-1/units",
        );
    });

    it("lists the hotel sections starting with the hotel data", () => {
        expect(MANAGED_HOTEL_SECTIONS.map(({ label }) => label)).toEqual([
            "Dados",
            "Unidades",
            "Tipos de acomodação",
            "Quartos",
            "Gestores",
            "Políticas",
        ]);
    });

    it("marks the data section active only on the hotel root", () => {
        expect(isSectionActive("/manager/hotels/hotel-1", "hotel-1", "")).toBe(
            true,
        );
        expect(
            isSectionActive("/manager/hotels/hotel-1/units", "hotel-1", ""),
        ).toBe(false);
    });

    it("marks a section active on its nested routes", () => {
        expect(
            isSectionActive(
                "/manager/hotels/hotel-1/units",
                "hotel-1",
                "units",
            ),
        ).toBe(true);
        expect(
            isSectionActive(
                "/manager/hotels/hotel-1/units/unit-1",
                "hotel-1",
                "units",
            ),
        ).toBe(true);
        expect(
            isSectionActive(
                "/manager/hotels/hotel-1/units-archive",
                "hotel-1",
                "units",
            ),
        ).toBe(false);
    });
});
