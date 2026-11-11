import { describe, expect, it } from "vitest";
import { AMENITY_TARGETS } from "../../../src/constants/amenity.js";
import {
    buildAmenityTargetPath,
    filterAmenitiesByName,
    mergeAmenityOptions,
    sortAmenitiesByName,
    toPickerAmenity,
} from "../../../src/modules/amenities/amenity-picker-options.js";

const CAFE = Object.freeze({
    id: "amenity-1",
    name: "Café da manhã",
    isGlobal: true,
    isActive: true,
});
const POOL = Object.freeze({
    id: "amenity-2",
    name: "piscina",
    isGlobal: false,
    isActive: true,
});

describe("buildAmenityTargetPath", () => {
    it.each([
        [AMENITY_TARGETS.HOTEL, "/api/hotels/id-1/amenities"],
        [AMENITY_TARGETS.UNIT, "/api/units/id-1/amenities"],
        [AMENITY_TARGETS.ROOM_TYPE, "/api/room-types/id-1/amenities"],
        [AMENITY_TARGETS.ROOM, "/api/rooms/id-1/amenities"],
    ])("builds the %s route", (target, path) => {
        expect(buildAmenityTargetPath(target, "id-1")).toBe(path);
    });

    it("encodes the identifier", () => {
        expect(buildAmenityTargetPath(AMENITY_TARGETS.ROOM, "a/b")).toBe(
            "/api/rooms/a%2Fb/amenities",
        );
    });

    it("rejects an unknown target", () => {
        expect(() => buildAmenityTargetPath("review", "id-1")).toThrow(
            TypeError,
        );
    });
});

describe("toPickerAmenity", () => {
    it("keeps only the picker fields", () => {
        expect(toPickerAmenity({ ...CAFE, createdAt: new Date() })).toEqual(
            CAFE,
        );
    });
});

describe("sortAmenitiesByName", () => {
    it("sorts by name ignoring case without mutating the input", () => {
        const input = [POOL, CAFE];

        expect(sortAmenitiesByName(input)).toEqual([CAFE, POOL]);
        expect(input).toEqual([POOL, CAFE]);
    });
});

describe("mergeAmenityOptions", () => {
    it("joins both lists without duplicates", () => {
        expect(mergeAmenityOptions([POOL, CAFE], [CAFE])).toEqual([CAFE, POOL]);
    });
});

describe("filterAmenitiesByName", () => {
    it("returns every amenity for a blank query", () => {
        expect(filterAmenitiesByName([CAFE, POOL], "  ")).toEqual([CAFE, POOL]);
    });

    it("matches ignoring case and accents", () => {
        expect(filterAmenitiesByName([CAFE, POOL], "MANHA")).toEqual([CAFE]);
        expect(filterAmenitiesByName([CAFE, POOL], "Píscina")).toEqual([POOL]);
    });
});
