import { describe, expect, it, vi } from "vitest";
import { AMENITY_TARGETS } from "../../src/constants/amenity.js";
import { HOTEL_STATUSES } from "../../src/constants/hotel-statuses.js";
import { ERROR_CODES } from "../../src/lib/errors.js";
import { createAmenityAssociationService } from "../../src/services/amenity-association-service.js";

const HOTEL_ID = "hotel-1";
const UNIT_ID = "unit-1";
const TYPE_ID = "type-1";
const ROOM_ID = "room-1";
const TRANSACTION_CLIENT = Object.freeze({ id: "transaction-client" });

const OWNER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const ADDITIONAL_MANAGER = Object.freeze({ id: "manager-3", role: "MANAGER" });
const OTHER_MANAGER = Object.freeze({ id: "manager-2", role: "MANAGER" });
const ADMIN = Object.freeze({ id: "admin-1", role: "ADMIN" });

const TARGETS = [
    [AMENITY_TARGETS.HOTEL, HOTEL_ID, ERROR_CODES.HOTEL_NOT_FOUND],
    [AMENITY_TARGETS.UNIT, UNIT_ID, ERROR_CODES.UNIT_NOT_FOUND],
    [AMENITY_TARGETS.ROOM_TYPE, TYPE_ID, ERROR_CODES.ROOM_TYPE_NOT_FOUND],
    [AMENITY_TARGETS.ROOM, ROOM_ID, ERROR_CODES.ROOM_NOT_FOUND],
];

function createWorld({
    hotelStatus = HOTEL_STATUSES.DRAFT,
    availableIds,
} = {}) {
    const hotel = {
        ownerUserId: OWNER.id,
        status: hotelStatus,
        managers: [{ userId: ADDITIONAL_MANAGER.id }],
    };
    const hotelRepository = {
        findById: vi.fn(async (id) => (id === HOTEL_ID ? { ...hotel } : null)),
    };
    const unitRepository = {
        findByIdWithHotel: vi.fn(async (id) =>
            id === UNIT_ID ? { id, hotel: { ...hotel } } : null,
        ),
    };
    const roomTypeRepository = {
        findByIdWithHotel: vi.fn(async (id) =>
            id === TYPE_ID ? { id, hotel: { ...hotel } } : null,
        ),
    };
    const roomRepository = {
        findByIdWithAccess: vi.fn(async (id) =>
            id === ROOM_ID ? { id, unit: { hotel: { ...hotel } } } : null,
        ),
    };
    const amenityRepository = {
        listAssociated: vi.fn(async () => [{ id: "a1" }]),
        findIdsAvailableTo: vi.fn(async (ids) => availableIds ?? ids),
        replaceAssociations: vi.fn(async () => {}),
    };
    const transactionRunner = {
        run: vi.fn(async (work) => work(TRANSACTION_CLIENT)),
    };
    const service = createAmenityAssociationService({
        amenityRepository,
        hotelRepository,
        unitRepository,
        roomTypeRepository,
        roomRepository,
        transactionRunner,
    });
    return { service, amenityRepository, transactionRunner };
}

describe.each(TARGETS)(
    "amenityAssociationService for %s",
    (target, id, notFoundCode) => {
        it("replaces the set inside one transaction for the owner (RF023-026)", async () => {
            const { service, amenityRepository, transactionRunner } =
                createWorld();

            const amenities = await service.replaceAmenities(
                OWNER,
                target,
                id,
                { amenityIds: ["a1", "a2"] },
            );

            expect(amenities).toEqual([{ id: "a1" }]);
            expect(transactionRunner.run).toHaveBeenCalledOnce();
            expect(amenityRepository.replaceAssociations).toHaveBeenCalledWith(
                target,
                id,
                ["a1", "a2"],
                TRANSACTION_CLIENT,
            );
        });

        it("lets an additional manager replace the set (RN110)", async () => {
            const { service, amenityRepository } = createWorld();

            await service.replaceAmenities(ADDITIONAL_MANAGER, target, id, {
                amenityIds: ["a1"],
            });

            expect(amenityRepository.replaceAssociations).toHaveBeenCalled();
        });

        it("hides the item from a manager outside the hotel", async () => {
            const { service, amenityRepository } = createWorld();

            await expect(
                service.replaceAmenities(OTHER_MANAGER, target, id, {
                    amenityIds: [],
                }),
            ).rejects.toMatchObject({ code: notFoundCode });
            expect(
                amenityRepository.replaceAssociations,
            ).not.toHaveBeenCalled();
        });

        it("answers 404 for an unknown id", async () => {
            const { service } = createWorld();

            await expect(
                service.listAmenities(OWNER, target, "missing"),
            ).rejects.toMatchObject({ code: notFoundCode });
        });

        it("refuses changes when the hotel is not in DRAFT (RN120)", async () => {
            const { service, amenityRepository } = createWorld({
                hotelStatus: HOTEL_STATUSES.PUBLISHED,
            });

            await expect(
                service.replaceAmenities(OWNER, target, id, {
                    amenityIds: ["a1"],
                }),
            ).rejects.toMatchObject({
                code: ERROR_CODES.INVALID_HOTEL_STATUS,
            });
            expect(
                amenityRepository.replaceAssociations,
            ).not.toHaveBeenCalled();
        });

        it("lets the admin read but not change", async () => {
            const { service } = createWorld();

            await expect(
                service.listAmenities(ADMIN, target, id),
            ).resolves.toEqual([{ id: "a1" }]);
            await expect(
                service.replaceAmenities(ADMIN, target, id, { amenityIds: [] }),
            ).rejects.toMatchObject({ code: notFoundCode });
        });
    },
);

describe("amenityAssociationService amenity availability", () => {
    it("answers 404 AMENITY_NOT_FOUND when an amenity is unknown, inactive or of a stranger", async () => {
        const { service, amenityRepository } = createWorld({
            availableIds: ["a1"],
        });

        await expect(
            service.replaceAmenities(OWNER, AMENITY_TARGETS.HOTEL, HOTEL_ID, {
                amenityIds: ["a1", "a2"],
            }),
        ).rejects.toMatchObject({ code: ERROR_CODES.AMENITY_NOT_FOUND });
        expect(amenityRepository.replaceAssociations).not.toHaveBeenCalled();
    });

    it("accepts amenities created by the owner and the additional managers of the hotel", async () => {
        const { service, amenityRepository } = createWorld();

        await service.replaceAmenities(
            ADDITIONAL_MANAGER,
            AMENITY_TARGETS.HOTEL,
            HOTEL_ID,
            { amenityIds: ["a1"] },
        );

        expect(amenityRepository.findIdsAvailableTo).toHaveBeenCalledWith(
            ["a1"],
            [OWNER.id, ADDITIONAL_MANAGER.id],
            TRANSACTION_CLIENT,
        );
    });

    it("clears the set with an empty list", async () => {
        const { service, amenityRepository } = createWorld({
            availableIds: [],
        });

        await service.replaceAmenities(OWNER, AMENITY_TARGETS.HOTEL, HOTEL_ID, {
            amenityIds: [],
        });

        expect(amenityRepository.replaceAssociations).toHaveBeenCalledWith(
            AMENITY_TARGETS.HOTEL,
            HOTEL_ID,
            [],
            TRANSACTION_CLIENT,
        );
    });
});
