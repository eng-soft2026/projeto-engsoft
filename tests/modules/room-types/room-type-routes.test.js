import { describe, expect, it } from "vitest";
import {
    buildNewRoomTypeHref,
    buildRoomTypeHref,
    buildRoomTypesHref,
} from "../../../src/modules/room-types/room-type-routes.js";

describe("room type routes", () => {
    it("builds the hotel room types list href", () => {
        expect(buildRoomTypesHref("hotel-1")).toBe(
            "/manager/hotels/hotel-1/room-types",
        );
        expect(buildRoomTypesHref("hotel-1", 2)).toBe(
            "/manager/hotels/hotel-1/room-types?page=2",
        );
    });

    it("builds the create and edit hrefs", () => {
        expect(buildNewRoomTypeHref("hotel-1")).toBe(
            "/manager/hotels/hotel-1/room-types/new",
        );
        expect(buildRoomTypeHref("hotel-1", "type-1")).toBe(
            "/manager/hotels/hotel-1/room-types/type-1",
        );
    });
});
