import { describe, expect, it, vi } from "vitest";
import { HOTEL_STATUSES } from "../../src/constants/hotel-statuses.js";
import { ERROR_CODES } from "../../src/lib/errors.js";
import { createAcceptanceService } from "../../src/services/acceptance-service.js";

const HOTEL_ID = "hotel-1";
const TRANSACTION_CLIENT = Object.freeze({ id: "transaction-client" });

const OWNER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const ADDITIONAL_MANAGER = Object.freeze({ id: "manager-3", role: "MANAGER" });
const OTHER_MANAGER = Object.freeze({ id: "manager-2", role: "MANAGER" });
const ADMIN = Object.freeze({ id: "admin-1", role: "ADMIN" });

const TYPES = [
    { id: "type-pets", code: "PETS" },
    { id: "type-other", code: "OTHER" },
];

const STORED = [
    {
        id: "acc-1",
        customLabel: null,
        isAllowed: true,
        details: null,
        acceptanceType: { code: "PETS", name: "Animais de estimação" },
    },
];

function createWorld({
    hotelStatus = HOTEL_STATUSES.DRAFT,
    types = TYPES,
} = {}) {
    const hotel = {
        ownerUserId: OWNER.id,
        status: hotelStatus,
        managers: [{ userId: ADDITIONAL_MANAGER.id }],
    };
    const hotelRepository = {
        findById: vi.fn(async (id) => (id === HOTEL_ID ? { ...hotel } : null)),
    };
    const hotelAcceptanceRepository = {
        listTypes: vi.fn(async () => types),
        listByHotel: vi.fn(async () => STORED),
        replaceAll: vi.fn(async () => {}),
    };
    const transactionRunner = {
        run: vi.fn(async (work) => work(TRANSACTION_CLIENT)),
    };
    const service = createAcceptanceService({
        hotelAcceptanceRepository,
        hotelRepository,
        transactionRunner,
    });
    return { service, hotelAcceptanceRepository, transactionRunner };
}

const INPUT = Object.freeze({
    acceptances: [
        { type: "PETS", customLabel: null, isAllowed: true, details: null },
        {
            type: "OTHER",
            customLabel: "Som alto",
            isAllowed: false,
            details: "Não após as 22h.",
        },
    ],
});

describe("acceptanceService.replaceAcceptances", () => {
    it("replaces all the rules of the hotel in one transaction (RF137, RN113)", async () => {
        const { service, hotelAcceptanceRepository, transactionRunner } =
            createWorld();

        const result = await service.replaceAcceptances(OWNER, HOTEL_ID, INPUT);

        expect(transactionRunner.run).toHaveBeenCalledOnce();
        expect(hotelAcceptanceRepository.replaceAll).toHaveBeenCalledWith(
            HOTEL_ID,
            [
                {
                    acceptanceTypeId: "type-pets",
                    customLabel: null,
                    isAllowed: true,
                    details: null,
                },
                {
                    acceptanceTypeId: "type-other",
                    customLabel: "Som alto",
                    isAllowed: false,
                    details: "Não após as 22h.",
                },
            ],
            TRANSACTION_CLIENT,
        );
        expect(result).toEqual([
            {
                id: "acc-1",
                type: "PETS",
                typeName: "Animais de estimação",
                customLabel: null,
                isAllowed: true,
                details: null,
            },
        ]);
    });

    it("lets an additional manager replace the rules", async () => {
        const { service, hotelAcceptanceRepository } = createWorld();

        await service.replaceAcceptances(ADDITIONAL_MANAGER, HOTEL_ID, INPUT);

        expect(hotelAcceptanceRepository.replaceAll).toHaveBeenCalled();
    });

    it("answers 400 when the type is missing from the database", async () => {
        const { service, hotelAcceptanceRepository } = createWorld({
            types: [],
        });

        await expect(
            service.replaceAcceptances(OWNER, HOTEL_ID, INPUT),
        ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_ERROR });
        expect(hotelAcceptanceRepository.replaceAll).not.toHaveBeenCalled();
    });

    it("refuses changes when the hotel is not in DRAFT (RN120)", async () => {
        const { service } = createWorld({
            hotelStatus: HOTEL_STATUSES.UNDER_REVIEW,
        });

        await expect(
            service.replaceAcceptances(OWNER, HOTEL_ID, INPUT),
        ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_HOTEL_STATUS });
    });

    it("hides the hotel from a manager outside it and from the admin on writes", async () => {
        const { service } = createWorld();

        await expect(
            service.replaceAcceptances(OTHER_MANAGER, HOTEL_ID, INPUT),
        ).rejects.toMatchObject({ code: ERROR_CODES.HOTEL_NOT_FOUND });
        await expect(
            service.replaceAcceptances(ADMIN, HOTEL_ID, INPUT),
        ).rejects.toMatchObject({ code: ERROR_CODES.HOTEL_NOT_FOUND });
    });
});

describe("acceptanceService.listAcceptances", () => {
    it("lets the owner and the admin read", async () => {
        const { service } = createWorld();

        await expect(
            service.listAcceptances(OWNER, HOTEL_ID),
        ).resolves.toHaveLength(1);
        await expect(
            service.listAcceptances(ADMIN, HOTEL_ID),
        ).resolves.toHaveLength(1);
    });

    it("answers 404 to a manager outside the hotel", async () => {
        const { service } = createWorld();

        await expect(
            service.listAcceptances(OTHER_MANAGER, HOTEL_ID),
        ).rejects.toMatchObject({ code: ERROR_CODES.HOTEL_NOT_FOUND });
    });
});
