import { describe, expect, it } from "vitest";
import {
    canManageHotel,
    canViewHotel,
    canViewHotelManagers,
    isAdditionalManager,
    isHotelOwner,
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

describe("additional managers (RN110)", () => {
    const HOTEL_WITH_MANAGERS = Object.freeze({
        ...HOTEL,
        managers: [{ userId: "manager-3" }],
    });
    const ADDITIONAL = Object.freeze({ id: "manager-3", role: "MANAGER" });
    const ADDITIONAL_WITHOUT_ROLE = Object.freeze({
        id: "manager-3",
        role: "CUSTOMER",
    });

    it("lets an additional manager manage and view the hotel", () => {
        expect(canManageHotel(ADDITIONAL, HOTEL_WITH_MANAGERS)).toBe(true);
        expect(canViewHotel(ADDITIONAL, HOTEL_WITH_MANAGERS)).toBe(true);
    });

    it("denies a manager who is not in the list", () => {
        expect(canManageHotel(OTHER_MANAGER, HOTEL_WITH_MANAGERS)).toBe(false);
    });

    it("denies a listed user who lost the MANAGER role", () => {
        expect(
            canManageHotel(ADDITIONAL_WITHOUT_ROLE, HOTEL_WITH_MANAGERS),
        ).toBe(false);
    });

    it("works when the hotel carries no manager list", () => {
        expect(canManageHotel(ADDITIONAL, HOTEL)).toBe(false);
    });

    it("treats only the owner as owner", () => {
        expect(isHotelOwner(OWNER, HOTEL_WITH_MANAGERS)).toBe(true);
        expect(isHotelOwner(ADDITIONAL, HOTEL_WITH_MANAGERS)).toBe(false);
        expect(isAdditionalManager(ADDITIONAL, HOTEL_WITH_MANAGERS)).toBe(true);
        expect(isAdditionalManager(OWNER, HOTEL_WITH_MANAGERS)).toBe(false);
    });

    it("shows the manager list only to the owner and the administrator", () => {
        expect(canViewHotelManagers(OWNER, HOTEL_WITH_MANAGERS)).toBe(true);
        expect(canViewHotelManagers(ADMIN, HOTEL_WITH_MANAGERS)).toBe(true);
        expect(canViewHotelManagers(ADDITIONAL, HOTEL_WITH_MANAGERS)).toBe(
            false,
        );
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
