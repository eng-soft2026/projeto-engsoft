import { describe, expect, it } from "vitest";
import { USER_ROLES } from "../../src/constants/user-roles.js";
import { evaluateCancellation } from "../../src/modules/reservations/cancellation-rules.js";
import { validateStay } from "../../src/modules/reservations/stay-rules.js";
import {
    DEFAULT_CLOCK_START,
    createFakeClock,
} from "../helpers/factories/index.js";

describe("createFakeClock", () => {
    it("starts at the default instant", () => {
        const clock = createFakeClock();

        expect(clock.now().toISOString()).toBe(DEFAULT_CLOCK_START);
    });

    it("stays still until it is advanced", () => {
        const clock = createFakeClock("2026-10-13T12:00:00.000Z");

        expect(clock.now()).toEqual(clock.now());
    });

    it("returns a copy, so changing the returned date does not move the clock", () => {
        const clock = createFakeClock("2026-10-13T12:00:00.000Z");

        clock.now().setUTCFullYear(2000);

        expect(clock.now().toISOString()).toBe("2026-10-13T12:00:00.000Z");
    });

    it("advances by days, hours, minutes, seconds and milliseconds", () => {
        const clock = createFakeClock("2026-10-13T12:00:00.000Z");

        const advanced = clock.advance({
            days: 1,
            hours: 2,
            minutes: 15,
            seconds: 30,
            milliseconds: 5,
        });

        expect(advanced.toISOString()).toBe("2026-10-14T14:15:30.005Z");
        expect(clock.now()).toEqual(advanced);
    });

    it("jumps to a given instant", () => {
        const clock = createFakeClock();

        clock.set("2027-02-01T00:00:00.000Z");

        expect(clock.now().toISOString()).toBe("2027-02-01T00:00:00.000Z");
    });

    it("rejects an invalid date", () => {
        expect(() => createFakeClock("not a date")).toThrow(TypeError);
        expect(() => createFakeClock().set("not a date")).toThrow(TypeError);
    });

    it("drives the 15-minute hold window through advance", () => {
        const clock = createFakeClock("2026-10-13T12:00:00.000Z");
        const expiresAt = new Date(clock.now().getTime() + 15 * 60 * 1000);

        clock.advance({ minutes: 14, seconds: 59 });
        expect(clock.now() < expiresAt).toBe(true);

        clock.advance({ seconds: 1 });
        expect(clock.now() < expiresAt).toBe(false);
    });

    it("crosses the 24-hour customer refund deadline (RN039)", () => {
        const checkIn = new Date("2026-10-20T14:00:00.000Z");
        const clock = createFakeClock("2026-10-19T14:00:00.000Z");
        const cancel = () =>
            evaluateCancellation({
                requestedByRole: USER_ROLES.CUSTOMER,
                checkIn,
                now: clock.now(),
            });

        expect(cancel()).toEqual({ isRefundable: true });

        clock.advance({ minutes: 1 });

        expect(cancel()).toEqual({ isRefundable: false });
    });

    it("crosses the 1-hour minimum notice of a stay", () => {
        const checkIn = new Date("2026-10-13T13:00:00.000Z");
        const checkOut = new Date("2026-10-14T12:00:00.000Z");
        const clock = createFakeClock("2026-10-13T12:00:00.000Z");
        const validate = () =>
            validateStay({ checkIn, checkOut, now: clock.now() });

        expect(validate).not.toThrow();

        clock.advance({ milliseconds: 1 });

        expect(validate).toThrow();
    });
});
