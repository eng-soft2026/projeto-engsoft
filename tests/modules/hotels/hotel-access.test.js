import { describe, expect, it } from "vitest";
import {
    canManageHotel,
    canViewHotel,
} from "../../../src/modules/hotels/hotel-access.js";

const HOTEL = Object.freeze({ id: "hotel-1", ownerUserId: "manager-1" });

const OWNER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const OTHER_MANAGER = Object.freeze({ id: "manager-2", role: "MANAGER" });
const ADMIN = Object.freeze({ id: "admin-1", role: "ADMIN" });
const CUSTOMER = Object.freeze({ id: "manager-1", role: "CUSTOMER" });

describe("canManageHotel", () => {
    it("allows the owner (RN109)", () => {
        expect(canManageHotel(OWNER, HOTEL)).toBe(true);
    });

    it("denies another manager", () => {
        expect(canManageHotel(OTHER_MANAGER, HOTEL)).toBe(false);
    });

    it("denies the administrator: admin actions use their own routes", () => {
        expect(canManageHotel(ADMIN, HOTEL)).toBe(false);
    });

    it("denies a user without the MANAGER role even with the owner id", () => {
        expect(canManageHotel(CUSTOMER, HOTEL)).toBe(false);
    });
});

describe("canViewHotel", () => {
    it("allows the owner", () => {
        expect(canViewHotel(OWNER, HOTEL)).toBe(true);
    });

    it("allows the administrator, who has global access (doc 15)", () => {
        expect(canViewHotel(ADMIN, HOTEL)).toBe(true);
    });

    it("denies another manager and customers", () => {
        expect(canViewHotel(OTHER_MANAGER, HOTEL)).toBe(false);
        expect(canViewHotel(CUSTOMER, HOTEL)).toBe(false);
    });
});
