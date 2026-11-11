import { describe, expect, it, vi } from "vitest";
import { HOTEL_STATUSES } from "../../src/constants/hotel-statuses.js";
import { ERROR_CODES } from "../../src/lib/errors.js";
import { createRoomPricePeriodService } from "../../src/services/room-price-period-service.js";
import { createFakeClock } from "../helpers/factories/index.js";

const HOTEL_ID = "3f1c2a4e-8b7d-4c6a-9e21-5d0b7a1c9f33";
const ROOM_ID = "c1c9f33a-8b7d-4c6a-9e21-3f1c2a4e0002";
const PERIOD_ID = "d1c9f33a-8b7d-4c6a-9e21-3f1c2a4e0005";
const TRANSACTION_CLIENT = Object.freeze({ id: "transaction-client" });
const NOW = "2026-12-10T15:00:00.000Z";

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const ADDITIONAL_MANAGER = Object.freeze({ id: "manager-3", role: "MANAGER" });
const OTHER_MANAGER = Object.freeze({ id: "manager-2", role: "MANAGER" });
const ADMIN = Object.freeze({ id: "admin-1", role: "ADMIN" });

function toDate(value) {
    return new Date(`${value}T00:00:00.000Z`);
}

function buildPeriod(overrides = {}) {
    return {
        id: PERIOD_ID,
        roomId: ROOM_ID,
        startDate: toDate("2026-12-20"),
        endDate: toDate("2026-12-31"),
        price: "450.00",
        createdAt: new Date(NOW),
        updatedAt: new Date(NOW),
        ...overrides,
    };
}

function createWorld({
    hotelStatus = HOTEL_STATUSES.PUBLISHED,
    roomIsActive = true,
    period = buildPeriod(),
    overlapping = null,
} = {}) {
    const clock = createFakeClock(NOW);
    const hotel = {
        ownerUserId: MANAGER.id,
        status: hotelStatus,
        managers: [{ userId: ADDITIONAL_MANAGER.id }],
    };
    const unit = { hotelId: HOTEL_ID, isActive: true, hotel };

    const roomRepository = {
        findByIdWithAccess: vi.fn(async (id) =>
            id === ROOM_ID ? { id, isActive: roomIsActive, unit } : null,
        ),
    };
    const roomPricePeriodRepository = {
        listByRoom: vi.fn(async () => [period]),
        findByIdWithAccess: vi.fn(async (id) =>
            period?.id === id
                ? { ...period, room: { isActive: roomIsActive, unit } }
                : null,
        ),
        findOverlapping: vi.fn(async () => overlapping),
        create: vi.fn(async (data) => buildPeriod(data)),
        updateFields: vi.fn(async (id, data) =>
            buildPeriod({ ...period, ...data }),
        ),
        deleteById: vi.fn(async () => {}),
    };
    const hotelRepository = { lockForUpdate: vi.fn(async () => {}) };
    const transactionRunner = {
        run: vi.fn(async (work) => work(TRANSACTION_CLIENT)),
    };
    const service = createRoomPricePeriodService({
        roomRepository,
        roomPricePeriodRepository,
        hotelRepository,
        transactionRunner,
        clock: clock.now,
    });
    return {
        service,
        clock,
        roomPricePeriodRepository,
        hotelRepository,
        transactionRunner,
    };
}

const CREATE_INPUT = Object.freeze({
    startDate: "2027-01-05",
    endDate: "2027-01-10",
    price: "500.00",
});

describe("roomPricePeriodService.listPricePeriods", () => {
    it("lists the room's periods as calendar dates and money strings for the manager and the admin", async () => {
        const { service } = createWorld();

        for (const user of [MANAGER, ADDITIONAL_MANAGER, ADMIN]) {
            const periods = await service.listPricePeriods(user, ROOM_ID);

            expect(periods).toEqual([
                expect.objectContaining({
                    id: PERIOD_ID,
                    startDate: "2026-12-20",
                    endDate: "2026-12-31",
                    price: "450.00",
                }),
            ]);
        }
    });

    it("answers 404 ROOM_NOT_FOUND to another manager and for an unknown room", async () => {
        const { service } = createWorld();

        await expect(
            service.listPricePeriods(OTHER_MANAGER, ROOM_ID),
        ).rejects.toMatchObject({ code: ERROR_CODES.ROOM_NOT_FOUND });
        await expect(
            service.listPricePeriods(MANAGER, PERIOD_ID),
        ).rejects.toMatchObject({ code: ERROR_CODES.ROOM_NOT_FOUND });
    });
});

describe("roomPricePeriodService.createPricePeriod", () => {
    it("creates the period inside a transaction that locks the hotel (RN025)", async () => {
        const {
            service,
            roomPricePeriodRepository,
            hotelRepository,
            transactionRunner,
        } = createWorld();

        const period = await service.createPricePeriod(
            MANAGER,
            ROOM_ID,
            CREATE_INPUT,
        );

        expect(transactionRunner.run).toHaveBeenCalledOnce();
        expect(hotelRepository.lockForUpdate).toHaveBeenCalledWith(
            HOTEL_ID,
            TRANSACTION_CLIENT,
        );
        expect(roomPricePeriodRepository.findOverlapping).toHaveBeenCalledWith(
            ROOM_ID,
            {
                startDate: toDate("2027-01-05"),
                endDate: toDate("2027-01-10"),
                excludeId: undefined,
            },
            TRANSACTION_CLIENT,
        );
        expect(roomPricePeriodRepository.create).toHaveBeenCalledWith(
            {
                roomId: ROOM_ID,
                startDate: toDate("2027-01-05"),
                endDate: toDate("2027-01-10"),
                price: "500.00",
            },
            TRANSACTION_CLIENT,
        );
        expect(period).toMatchObject({
            startDate: "2027-01-05",
            endDate: "2027-01-10",
            price: "500.00",
        });
    });

    it("refuses an overlapping period with 409 PRICE_PERIOD_OVERLAP", async () => {
        const { service, roomPricePeriodRepository } = createWorld({
            overlapping: { id: PERIOD_ID },
        });

        await expect(
            service.createPricePeriod(MANAGER, ROOM_ID, CREATE_INPUT),
        ).rejects.toMatchObject({ code: ERROR_CODES.PRICE_PERIOD_OVERLAP });
        expect(roomPricePeriodRepository.create).not.toHaveBeenCalled();
    });

    it("accepts a period starting today, in the business time zone", async () => {
        const { service, clock } = createWorld();
        clock.set("2027-01-05T02:00:00.000Z");

        await expect(
            service.createPricePeriod(MANAGER, ROOM_ID, {
                ...CREATE_INPUT,
                startDate: "2027-01-04",
            }),
        ).resolves.toMatchObject({ startDate: "2027-01-04" });
    });

    it("refuses a start date before today with 400", async () => {
        const { service, transactionRunner } = createWorld();

        await expect(
            service.createPricePeriod(MANAGER, ROOM_ID, {
                ...CREATE_INPUT,
                startDate: "2026-12-09",
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_ERROR });
        expect(transactionRunner.run).not.toHaveBeenCalled();
    });

    it("works in DRAFT and PUBLISHED but not under review or blocked (RN129)", async () => {
        for (const status of [HOTEL_STATUSES.DRAFT, HOTEL_STATUSES.PUBLISHED]) {
            const { service } = createWorld({ hotelStatus: status });
            await expect(
                service.createPricePeriod(MANAGER, ROOM_ID, CREATE_INPUT),
            ).resolves.toBeDefined();
        }
        for (const status of [
            HOTEL_STATUSES.UNDER_REVIEW,
            HOTEL_STATUSES.BLOCKED,
        ]) {
            const { service } = createWorld({ hotelStatus: status });
            await expect(
                service.createPricePeriod(MANAGER, ROOM_ID, CREATE_INPUT),
            ).rejects.toMatchObject({
                code: ERROR_CODES.INVALID_HOTEL_STATUS,
            });
        }
    });

    it("refuses an inactive room with 409 ROOM_INACTIVE", async () => {
        const { service } = createWorld({ roomIsActive: false });

        await expect(
            service.createPricePeriod(MANAGER, ROOM_ID, CREATE_INPUT),
        ).rejects.toMatchObject({ code: ERROR_CODES.ROOM_INACTIVE });
    });

    it("hides another manager's room and refuses the admin", async () => {
        for (const user of [OTHER_MANAGER, ADMIN]) {
            const { service } = createWorld();
            await expect(
                service.createPricePeriod(user, ROOM_ID, CREATE_INPUT),
            ).rejects.toMatchObject({ code: ERROR_CODES.ROOM_NOT_FOUND });
        }
    });
});

describe("roomPricePeriodService.updatePricePeriod", () => {
    it("updates the price and dates of a future period, excluding itself from the overlap check", async () => {
        const { service, roomPricePeriodRepository, clock } = createWorld();

        const period = await service.updatePricePeriod(MANAGER, PERIOD_ID, {
            endDate: "2027-01-02",
            price: "480.00",
        });

        expect(roomPricePeriodRepository.findOverlapping).toHaveBeenCalledWith(
            ROOM_ID,
            {
                startDate: toDate("2026-12-20"),
                endDate: toDate("2027-01-02"),
                excludeId: PERIOD_ID,
            },
            TRANSACTION_CLIENT,
        );
        expect(roomPricePeriodRepository.updateFields).toHaveBeenCalledWith(
            PERIOD_ID,
            {
                endDate: toDate("2027-01-02"),
                price: "480.00",
                updatedAt: clock.now(),
            },
            TRANSACTION_CLIENT,
        );
        expect(period).toMatchObject({
            endDate: "2027-01-02",
            price: "480.00",
        });
    });

    it("refuses a period that already started with 409 PRICE_PERIOD_PAST (RNF018)", async () => {
        const { service, roomPricePeriodRepository } = createWorld({
            period: buildPeriod({ startDate: toDate("2026-12-09") }),
        });

        await expect(
            service.updatePricePeriod(MANAGER, PERIOD_ID, { price: "1.00" }),
        ).rejects.toMatchObject({ code: ERROR_CODES.PRICE_PERIOD_PAST });
        expect(roomPricePeriodRepository.updateFields).not.toHaveBeenCalled();
    });

    it("refuses moving the start before today and an end before the stored start", async () => {
        const { service } = createWorld();

        await expect(
            service.updatePricePeriod(MANAGER, PERIOD_ID, {
                startDate: "2026-12-01",
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_ERROR });
        await expect(
            service.updatePricePeriod(MANAGER, PERIOD_ID, {
                endDate: "2026-12-19",
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_ERROR });
    });

    it("refuses an overlap with another period", async () => {
        const { service } = createWorld({ overlapping: { id: "other" } });

        await expect(
            service.updatePricePeriod(MANAGER, PERIOD_ID, {
                startDate: "2026-12-15",
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.PRICE_PERIOD_OVERLAP });
    });

    it("answers 404 PRICE_PERIOD_NOT_FOUND to another manager and for an unknown period", async () => {
        const { service } = createWorld();

        await expect(
            service.updatePricePeriod(OTHER_MANAGER, PERIOD_ID, {
                price: "1.00",
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.PRICE_PERIOD_NOT_FOUND });
        await expect(
            service.updatePricePeriod(MANAGER, ROOM_ID, { price: "1.00" }),
        ).rejects.toMatchObject({ code: ERROR_CODES.PRICE_PERIOD_NOT_FOUND });
    });

    it("refuses an inactive room and a hotel under review", async () => {
        const inactive = createWorld({ roomIsActive: false });
        const underReview = createWorld({
            hotelStatus: HOTEL_STATUSES.UNDER_REVIEW,
        });

        await expect(
            inactive.service.updatePricePeriod(MANAGER, PERIOD_ID, {
                price: "1.00",
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.ROOM_INACTIVE });
        await expect(
            underReview.service.updatePricePeriod(MANAGER, PERIOD_ID, {
                price: "1.00",
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_HOTEL_STATUS });
    });
});

describe("roomPricePeriodService.deletePricePeriod", () => {
    it("removes a future period inside a transaction that locks the hotel", async () => {
        const { service, roomPricePeriodRepository, hotelRepository } =
            createWorld();

        const result = await service.deletePricePeriod(MANAGER, PERIOD_ID);

        expect(result).toEqual({ id: PERIOD_ID });
        expect(hotelRepository.lockForUpdate).toHaveBeenCalledWith(
            HOTEL_ID,
            TRANSACTION_CLIENT,
        );
        expect(roomPricePeriodRepository.deleteById).toHaveBeenCalledWith(
            PERIOD_ID,
            TRANSACTION_CLIENT,
        );
    });

    it("keeps a period that already started or ended (RNF018)", async () => {
        for (const startDate of ["2026-12-09", "2026-11-01"]) {
            const { service, roomPricePeriodRepository } = createWorld({
                period: buildPeriod({
                    startDate: toDate(startDate),
                    endDate: toDate("2026-12-10"),
                }),
            });

            await expect(
                service.deletePricePeriod(MANAGER, PERIOD_ID),
            ).rejects.toMatchObject({ code: ERROR_CODES.PRICE_PERIOD_PAST });
            expect(roomPricePeriodRepository.deleteById).not.toHaveBeenCalled();
        }
    });

    it("rechecks the start inside the transaction when the day turns", async () => {
        const { service, clock, roomPricePeriodRepository, transactionRunner } =
            createWorld({
                period: buildPeriod({ startDate: toDate("2026-12-10") }),
            });
        transactionRunner.run.mockImplementation(async (work) => {
            clock.set("2026-12-11T12:00:00.000Z");
            return work(TRANSACTION_CLIENT);
        });

        await expect(
            service.deletePricePeriod(MANAGER, PERIOD_ID),
        ).rejects.toMatchObject({ code: ERROR_CODES.PRICE_PERIOD_PAST });
        expect(roomPricePeriodRepository.deleteById).not.toHaveBeenCalled();
    });
});
