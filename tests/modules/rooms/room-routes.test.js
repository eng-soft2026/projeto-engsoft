import { describe, expect, it } from "vitest";
import {
    buildNewRoomHref,
    buildRoomHref,
    buildRoomsHref,
} from "../../../src/modules/rooms/room-routes.js";

describe("room routes", () => {
    it("builds the rooms list href with optional unit and page", () => {
        expect(buildRoomsHref("hotel-1")).toBe("/manager/hotels/hotel-1/rooms");
        expect(buildRoomsHref("hotel-1", { unitId: "unit-1" })).toBe(
            "/manager/hotels/hotel-1/rooms?unit=unit-1",
        );
        expect(buildRoomsHref("hotel-1", { unitId: "unit-1", page: 2 })).toBe(
            "/manager/hotels/hotel-1/rooms?unit=unit-1&page=2",
        );
    });

    it("builds the create and edit hrefs", () => {
        expect(buildNewRoomHref("hotel-1", "unit-1")).toBe(
            "/manager/hotels/hotel-1/rooms/new?unit=unit-1",
        );
        expect(buildRoomHref("hotel-1", "room-1")).toBe(
            "/manager/hotels/hotel-1/rooms/room-1",
        );
    });
});
