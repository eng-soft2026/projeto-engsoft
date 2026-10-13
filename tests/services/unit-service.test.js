import { describe, expect, it, vi } from "vitest";
import { HOTEL_STATUSES } from "../../src/constants/hotel-statuses.js";
import { ERROR_CODES, NotFoundError } from "../../src/lib/errors.js";
import { createUnitService } from "../../src/services/unit-service.js";

const HOTEL_ID = "3f1c2a4e-8b7d-4c6a-9e21-5d0b7a1c9f33";
const UNIT_ID = "7a1c9f33-8b7d-4c6a-9e21-3f1c2a4e5d0b";
const TRANSACTION_CLIENT = Object.freeze({ id: "transaction-client" });

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const OTHER_MANAGER = Object.freeze({ id: "manager-2", role: "MANAGER" });
const ADMIN = Object.freeze({ id: "admin-1", role: "ADMIN" });
const CUSTOMER = Object.freeze({ id: "customer-1", role: "CUSTOMER" });

const ADDRESS = Object.freeze({
    zipCode: "01310100",
    street: "Avenida Paulista",
    number: "1000",
    complement: null,
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
});

const UNIT_INPUT = Object.freeze({
    name: "Unidade Paulista",
    email: "paulista@marazul.example.com",
    checkInTime: "14:00",
    checkOutTime: "12:00",
    overbookingPercentage: 5,
    address: ADDRESS,
    phones: ["11912345678"],
});

function buildStoredUnit(overrides = {}) {
    return {
        id: UNIT_ID,
        hotelId: HOTEL_ID,
        name: "Unidade Paulista",
        email: "paulista@marazul.example.com",
        checkInTime: new Date("1970-01-01T14:00:00.000Z"),
        checkOutTime: new Date("1970-01-01T12:00:00.000Z"),
        overbookingPercentage: 5,
        isActive: true,
        address: { ...ADDRESS, latitude: null, longitude: null },
        phones: [{ id: "phone-1", phone: "11912345678" }],
        hotel: { ownerUserId: MANAGER.id, status: HOTEL_STATUSES.DRAFT },
        ...overrides,
    };
}

function createWorld({
    hotelStatus = HOTEL_STATUSES.DRAFT,
    maxOverbooking = "10",
    storedUnit = buildStoredUnit(),
    managers = [],
} = {}) {
    const state = {
        hotel: {
            id: HOTEL_ID,
            ownerUserId: MANAGER.id,
            status: hotelStatus,
            managers,
        },
        unit: storedUnit,
    };
    const calls = [];

    const hotelRepository = {
        findById: vi.fn(async (id) =>
            state.hotel.id === id ? { ...state.hotel } : null,
        ),
    };
    const unitRepository = {
        create: vi.fn(async (data) => {
            calls.push("create");
            return buildStoredUnit({
                ...data,
                address: { ...data.address, latitude: null, longitude: null },
                phones: data.phones.map((phone) => ({ id: phone, phone })),
            });
        }),
        findByIdWithHotel: vi.fn(async (id) =>
            state.unit?.id === id
                ? { ...state.unit, hotel: { ...state.hotel } }
                : null,
        ),
        listByHotel: vi.fn(async () => [buildStoredUnit()]),
        updateFields: vi.fn(async () => {
            calls.push("updateFields");
        }),
        replaceAddress: vi.fn(async () => {
            calls.push("replaceAddress");
        }),
        replacePhones: vi.fn(async () => {
            calls.push("replacePhones");
        }),
    };
    const systemSettingRepository = {
        findByKey: vi.fn(async () =>
            maxOverbooking === null ? null : { value: maxOverbooking },
        ),
    };
    const transactionRunner = {
        run: vi.fn(async (work) => work(TRANSACTION_CLIENT)),
    };

    const service = createUnitService({
        unitRepository,
        hotelRepository,
        systemSettingRepository,
        transactionRunner,
    });
    return {
        service,
        state,
        calls,
        unitRepository,
        hotelRepository,
        transactionRunner,
    };
}

describe("unitService.createUnit", () => {
    it("creates the unit with address and phones in one transaction", async () => {
        const world = createWorld();

        const unit = await world.service.createUnit(
            MANAGER,
            HOTEL_ID,
            UNIT_INPUT,
        );

        expect(world.transactionRunner.run).toHaveBeenCalledOnce();
        expect(world.unitRepository.create).toHaveBeenCalledWith(
            {
                hotelId: HOTEL_ID,
                name: "Unidade Paulista",
                email: "paulista@marazul.example.com",
                checkInTime: new Date("1970-01-01T14:00:00.000Z"),
                checkOutTime: new Date("1970-01-01T12:00:00.000Z"),
                overbookingPercentage: 5,
                address: ADDRESS,
                phones: ["11912345678"],
            },
            TRANSACTION_CLIENT,
        );
        expect(unit.checkInTime).toBe("14:00");
        expect(unit.checkOutTime).toBe("12:00");
        expect(unit.address.latitude).toBeNull();
        expect(unit.address.longitude).toBeNull();
        expect(unit).not.toHaveProperty("hotel");
    });

    it("never stores coordinates sent by the caller (RN088)", async () => {
        const world = createWorld();

        await world.service.createUnit(MANAGER, HOTEL_ID, UNIT_INPUT);

        const [data] = world.unitRepository.create.mock.calls[0];
        expect(data.address).not.toHaveProperty("latitude");
    });

    it("accepts the overbooking limits 0 and 10 (RN048)", async () => {
        const world = createWorld();

        await world.service.createUnit(MANAGER, HOTEL_ID, {
            ...UNIT_INPUT,
            overbookingPercentage: 0,
        });
        await world.service.createUnit(MANAGER, HOTEL_ID, {
            ...UNIT_INPUT,
            overbookingPercentage: 10,
        });

        expect(world.unitRepository.create).toHaveBeenCalledTimes(2);
    });

    it("refuses an overbooking above the platform ceiling even if the schema was skipped (RN047)", async () => {
        const world = createWorld();

        await expect(
            world.service.createUnit(MANAGER, HOTEL_ID, {
                ...UNIT_INPUT,
                overbookingPercentage: 11,
            }),
        ).rejects.toMatchObject({
            code: ERROR_CODES.VALIDATION_ERROR,
            message: "O overbooking deve ser no máximo 10%.",
        });
        expect(world.unitRepository.create).not.toHaveBeenCalled();
    });

    it("refuses an overbooking above the lowered system setting", async () => {
        const world = createWorld({ maxOverbooking: "5" });

        await expect(
            world.service.createUnit(MANAGER, HOTEL_ID, {
                ...UNIT_INPUT,
                overbookingPercentage: 6,
            }),
        ).rejects.toMatchObject({
            message: "O overbooking deve ser no máximo 5%.",
        });
        await expect(
            world.service.createUnit(MANAGER, HOTEL_ID, {
                ...UNIT_INPUT,
                overbookingPercentage: 5,
            }),
        ).resolves.toBeDefined();
    });

    it("never lets the system setting raise the platform ceiling", async () => {
        const world = createWorld({ maxOverbooking: "50" });

        await expect(
            world.service.createUnit(MANAGER, HOTEL_ID, {
                ...UNIT_INPUT,
                overbookingPercentage: 11,
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_ERROR });
    });

    it("falls back to the platform ceiling when the setting is missing or invalid", async () => {
        const missing = createWorld({ maxOverbooking: null });
        const invalid = createWorld({ maxOverbooking: "abc" });
        const input = { ...UNIT_INPUT, overbookingPercentage: 10 };

        await expect(
            missing.service.createUnit(MANAGER, HOTEL_ID, input),
        ).resolves.toBeDefined();
        await expect(
            invalid.service.createUnit(MANAGER, HOTEL_ID, input),
        ).resolves.toBeDefined();
    });

    it("answers 404 for a hotel of another manager, without revealing it", async () => {
        const world = createWorld();

        await expect(
            world.service.createUnit(OTHER_MANAGER, HOTEL_ID, UNIT_INPUT),
        ).rejects.toMatchObject({ code: ERROR_CODES.HOTEL_NOT_FOUND });
        expect(world.unitRepository.create).not.toHaveBeenCalled();
    });

    it("answers 404 for an unknown hotel", async () => {
        const world = createWorld();

        await expect(
            world.service.createUnit(MANAGER, "missing", UNIT_INPUT),
        ).rejects.toBeInstanceOf(NotFoundError);
    });

    it.each([ADMIN, CUSTOMER])("refuses the role %o", async (user) => {
        const world = createWorld();

        await expect(
            world.service.createUnit(user, HOTEL_ID, UNIT_INPUT),
        ).rejects.toMatchObject({ code: ERROR_CODES.HOTEL_NOT_FOUND });
    });

    it.each([
        HOTEL_STATUSES.UNDER_REVIEW,
        HOTEL_STATUSES.PUBLISHED,
        HOTEL_STATUSES.BLOCKED,
    ])("refuses a hotel in %s (RN120)", async (status) => {
        const world = createWorld({ hotelStatus: status });

        await expect(
            world.service.createUnit(MANAGER, HOTEL_ID, UNIT_INPUT),
        ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_HOTEL_STATUS });
        expect(world.unitRepository.create).not.toHaveBeenCalled();
    });

    it("rechecks the hotel status inside the transaction", async () => {
        const world = createWorld();
        world.hotelRepository.findById
            .mockResolvedValueOnce({
                id: HOTEL_ID,
                ownerUserId: MANAGER.id,
                status: HOTEL_STATUSES.DRAFT,
            })
            .mockResolvedValueOnce({
                id: HOTEL_ID,
                ownerUserId: MANAGER.id,
                status: HOTEL_STATUSES.UNDER_REVIEW,
            });

        await expect(
            world.service.createUnit(MANAGER, HOTEL_ID, UNIT_INPUT),
        ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_HOTEL_STATUS });
        expect(world.hotelRepository.findById).toHaveBeenLastCalledWith(
            HOTEL_ID,
            TRANSACTION_CLIENT,
        );
        expect(world.unitRepository.create).not.toHaveBeenCalled();
    });

    it("propagates a failure of the nested write so nothing is committed", async () => {
        const world = createWorld();
        world.unitRepository.create.mockRejectedValue(
            new Error("phones failed"),
        );

        await expect(
            world.service.createUnit(MANAGER, HOTEL_ID, UNIT_INPUT),
        ).rejects.toThrow("phones failed");
    });
});

describe("unitService.listUnits", () => {
    it("lists the units of the owner hotel with times as HH:mm", async () => {
        const world = createWorld();

        const units = await world.service.listUnits(MANAGER, HOTEL_ID);

        expect(units).toHaveLength(1);
        expect(units[0].checkInTime).toBe("14:00");
        expect(units[0]).not.toHaveProperty("hotel");
    });

    it("lets the administrator read any hotel", async () => {
        const world = createWorld();

        await expect(
            world.service.listUnits(ADMIN, HOTEL_ID),
        ).resolves.toHaveLength(1);
    });

    it("answers 404 for a hotel of another manager and for a customer", async () => {
        const world = createWorld();

        await expect(
            world.service.listUnits(OTHER_MANAGER, HOTEL_ID),
        ).rejects.toMatchObject({ code: ERROR_CODES.HOTEL_NOT_FOUND });
        await expect(
            world.service.listUnits(CUSTOMER, HOTEL_ID),
        ).rejects.toMatchObject({ code: ERROR_CODES.HOTEL_NOT_FOUND });
    });
});

describe("unitService.getUnit", () => {
    it("returns the unit with address and phones to the owner and the admin", async () => {
        const world = createWorld();

        const asManager = await world.service.getUnit(MANAGER, UNIT_ID);
        const asAdmin = await world.service.getUnit(ADMIN, UNIT_ID);

        expect(asManager.phones).toEqual([
            { id: "phone-1", phone: "11912345678" },
        ]);
        expect(asAdmin.id).toBe(UNIT_ID);
    });

    it("answers 404 UNIT_NOT_FOUND for another manager and for an unknown unit", async () => {
        const world = createWorld();

        await expect(
            world.service.getUnit(OTHER_MANAGER, UNIT_ID),
        ).rejects.toMatchObject({ code: ERROR_CODES.UNIT_NOT_FOUND });
        await expect(
            world.service.getUnit(MANAGER, "missing"),
        ).rejects.toMatchObject({ code: ERROR_CODES.UNIT_NOT_FOUND });
    });
});

describe("unitService.updateUnit", () => {
    it("updates only the sent scalar fields and converts the times", async () => {
        const world = createWorld();

        await world.service.updateUnit(MANAGER, UNIT_ID, {
            name: "Novo nome",
            checkInTime: "15:00",
            overbookingPercentage: 0,
        });

        expect(world.unitRepository.updateFields).toHaveBeenCalledWith(
            UNIT_ID,
            {
                name: "Novo nome",
                checkInTime: new Date("1970-01-01T15:00:00.000Z"),
                overbookingPercentage: 0,
                updatedAt: expect.any(Date),
            },
            TRANSACTION_CLIENT,
        );
        expect(world.unitRepository.replaceAddress).not.toHaveBeenCalled();
        expect(world.unitRepository.replacePhones).not.toHaveBeenCalled();
    });

    it("replaces the address and the phones in the same transaction", async () => {
        const world = createWorld();
        const address = { ...ADDRESS, city: "Santos" };

        await world.service.updateUnit(MANAGER, UNIT_ID, {
            address,
            phones: ["1123456789"],
        });

        expect(world.transactionRunner.run).toHaveBeenCalledOnce();
        expect(world.unitRepository.replaceAddress).toHaveBeenCalledWith(
            UNIT_ID,
            address,
            TRANSACTION_CLIENT,
        );
        expect(world.unitRepository.replacePhones).toHaveBeenCalledWith(
            UNIT_ID,
            ["1123456789"],
            TRANSACTION_CLIENT,
        );
        expect(world.calls).toEqual([
            "updateFields",
            "replaceAddress",
            "replacePhones",
        ]);
    });

    it("deactivates the unit without deleting it", async () => {
        const world = createWorld();

        await world.service.updateUnit(MANAGER, UNIT_ID, { isActive: false });

        expect(world.unitRepository.updateFields).toHaveBeenCalledWith(
            UNIT_ID,
            { isActive: false, updatedAt: expect.any(Date) },
            TRANSACTION_CLIENT,
        );
    });

    it("refuses an overbooking above the limit and writes nothing", async () => {
        const world = createWorld();

        await expect(
            world.service.updateUnit(MANAGER, UNIT_ID, {
                overbookingPercentage: 11,
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_ERROR });
        expect(world.transactionRunner.run).not.toHaveBeenCalled();
    });

    it("answers 404 for a unit of another manager, an admin or a customer", async () => {
        const world = createWorld();

        for (const user of [OTHER_MANAGER, ADMIN, CUSTOMER]) {
            await expect(
                world.service.updateUnit(user, UNIT_ID, { name: "Novo" }),
            ).rejects.toMatchObject({ code: ERROR_CODES.UNIT_NOT_FOUND });
        }
        expect(world.unitRepository.updateFields).not.toHaveBeenCalled();
    });

    it.each([
        HOTEL_STATUSES.UNDER_REVIEW,
        HOTEL_STATUSES.PUBLISHED,
        HOTEL_STATUSES.BLOCKED,
    ])("refuses the edit while the hotel is %s (RN120)", async (status) => {
        const world = createWorld({ hotelStatus: status });

        await expect(
            world.service.updateUnit(MANAGER, UNIT_ID, { name: "Novo" }),
        ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_HOTEL_STATUS });
        expect(world.unitRepository.updateFields).not.toHaveBeenCalled();
    });

    it("returns the stored unit after the update", async () => {
        const world = createWorld();

        const unit = await world.service.updateUnit(MANAGER, UNIT_ID, {
            name: "Novo nome",
        });

        expect(unit.id).toBe(UNIT_ID);
        expect(unit.checkOutTime).toBe("12:00");
    });
});

describe("unitService with additional managers (RN110)", () => {
    const COMANAGER = Object.freeze({ id: "manager-3", role: "MANAGER" });
    const MANAGERS = [{ userId: COMANAGER.id }];

    it("lets an additional manager create and edit units", async () => {
        const world = createWorld({ managers: MANAGERS });

        await expect(
            world.service.createUnit(COMANAGER, HOTEL_ID, UNIT_INPUT),
        ).resolves.toMatchObject({ id: UNIT_ID });
        await expect(
            world.service.updateUnit(COMANAGER, UNIT_ID, { name: "Novo" }),
        ).resolves.toMatchObject({ id: UNIT_ID });
    });

    it("keeps the manager list out of the presented unit", async () => {
        const world = createWorld({ managers: MANAGERS });

        const unit = await world.service.getUnit(COMANAGER, UNIT_ID);

        expect(unit).not.toHaveProperty("hotel");
        expect(JSON.stringify(unit)).not.toContain(COMANAGER.id);
    });

    it("still answers 404 to a manager outside the list", async () => {
        const world = createWorld({ managers: MANAGERS });

        await expect(
            world.service.createUnit(OTHER_MANAGER, HOTEL_ID, UNIT_INPUT),
        ).rejects.toMatchObject({ code: ERROR_CODES.HOTEL_NOT_FOUND });
    });
});
