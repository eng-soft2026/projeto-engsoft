import { beforeEach, describe, expect, it, vi } from "vitest";
import * as hotelRoute from "../../../src/app/api/hotels/[id]/route.js";
import * as hotelManagersRoute from "../../../src/app/api/hotels/[id]/managers/route.js";
import * as hotelAmenitiesRoute from "../../../src/app/api/hotels/[id]/amenities/route.js";
import * as roomRoute from "../../../src/app/api/rooms/[id]/route.js";
import * as unitRoute from "../../../src/app/api/units/[id]/route.js";
import * as unitRoomsRoute from "../../../src/app/api/units/[id]/rooms/route.js";
import {
    HOTEL_ID,
    createJsonRequest,
    createRouteContext,
} from "../../helpers/http.js";

const { auth, findActiveUser, transactionRunner, repositories, state } =
    vi.hoisted(() => {
        const transactionClient = Object.freeze({
            id: "fake-transaction-client",
        });
        const state = {
            hotels: new Map(),
            units: new Map(),
            rooms: new Map(),
            roomTypes: new Map(),
        };

        return {
            auth: vi.fn(),
            findActiveUser: vi.fn(),
            transactionRunner: {
                run: vi.fn(async (work) => work(transactionClient)),
            },
            state,
            repositories: {
                hotel: {
                    findById: vi.fn(async (id) => state.hotels.get(id) ?? null),
                    findByIdWithReviewNotes: vi.fn(async (id) => {
                        const hotel = state.hotels.get(id);
                        return hotel ? { ...hotel, reviewNotes: [] } : null;
                    }),
                    updateFieldsIfStatus: vi.fn(async () => true),
                },
                hotelReviewNote: {
                    create: vi.fn(),
                },
                unit: {
                    findByIdWithHotel: vi.fn(
                        async (id) => state.units.get(id) ?? null,
                    ),
                    create: vi.fn(),
                    updateFields: vi.fn(),
                    replaceAddress: vi.fn(),
                    replacePhones: vi.fn(),
                },
                systemSetting: {
                    findByKey: vi.fn(async () => null),
                },
                room: {
                    findByIdWithAccess: vi.fn(
                        async (id) => state.rooms.get(id) ?? null,
                    ),
                    create: vi.fn(),
                    updateFields: vi.fn(),
                    listByUnit: vi.fn(async () => []),
                },
                roomType: {
                    findById: vi.fn(
                        async (id) => state.roomTypes.get(id) ?? null,
                    ),
                    findByIdWithHotel: vi.fn(async (id) => {
                        const roomType = state.roomTypes.get(id);
                        return roomType
                            ? {
                                  ...roomType,
                                  hotel: state.hotels.get(roomType.hotelId),
                              }
                            : null;
                    }),
                    create: vi.fn(),
                    updateFields: vi.fn(),
                    replaceBeds: vi.fn(),
                    hasRoomReferences: vi.fn(async () => false),
                    deleteById: vi.fn(),
                    listByHotel: vi.fn(async () => []),
                },
                amenity: {
                    listAssociated: vi.fn(async () => []),
                    findIdsAvailableTo: vi.fn(async (ids) => ids),
                    replaceAssociations: vi.fn(),
                },
                hotelManager: {
                    create: vi.fn(),
                    delete: vi.fn(async () => true),
                    exists: vi.fn(async () => false),
                },
                user: {
                    findByEmail: vi.fn(),
                },
                auditLog: {
                    create: vi.fn(),
                },
            },
        };
    });

vi.mock("../../../src/modules/auth/auth.js", () => ({ auth }));
vi.mock("../../../src/services/auth-service.js", () => ({
    authService: { findActiveUser },
}));
vi.mock("../../../src/lib/transaction.js", () => ({ transactionRunner }));
vi.mock("../../../src/repositories/hotel-repository.js", () => ({
    hotelRepository: repositories.hotel,
}));
vi.mock("../../../src/repositories/hotel-review-note-repository.js", () => ({
    hotelReviewNoteRepository: repositories.hotelReviewNote,
}));
vi.mock("../../../src/repositories/unit-repository.js", () => ({
    unitRepository: repositories.unit,
}));
vi.mock("../../../src/repositories/system-setting-repository.js", () => ({
    systemSettingRepository: repositories.systemSetting,
}));
vi.mock("../../../src/repositories/room-repository.js", () => ({
    roomRepository: repositories.room,
}));
vi.mock("../../../src/repositories/room-type-repository.js", () => ({
    roomTypeRepository: repositories.roomType,
}));
vi.mock("../../../src/repositories/amenity-repository.js", () => ({
    amenityRepository: repositories.amenity,
}));
vi.mock("../../../src/repositories/hotel-manager-repository.js", () => ({
    hotelManagerRepository: repositories.hotelManager,
}));
vi.mock("../../../src/repositories/user-repository.js", () => ({
    userRepository: repositories.user,
}));
vi.mock("../../../src/repositories/audit-log-repository.js", () => ({
    auditLogRepository: repositories.auditLog,
}));

const OWNER = Object.freeze({
    id: "manager-owner",
    role: "MANAGER",
    isActive: true,
});
const CO_MANAGER = Object.freeze({
    id: "manager-co",
    role: "MANAGER",
    isActive: true,
});
const OTHER_MANAGER = Object.freeze({
    id: "manager-other",
    role: "MANAGER",
    isActive: true,
});
const ADMIN = Object.freeze({ id: "admin-1", role: "ADMIN", isActive: true });

const OTHER_HOTEL_ID = "8f9e0d1c-2b3a-4c5d-8e9f-0a1b2c3d4e5f";
const MISSING_HOTEL_ID = "9a0b1c2d-3e4f-5a6b-8c9d-0e1f2a3b4c5d";
const UNIT_ID = "a0b1c2d3-e4f5-4a6b-8c9d-0e1f2a3b4c5d";
const FOREIGN_UNIT_ID = "b1c2d3e4-f5a6-4b7c-9d0e-1f2a3b4c5d6e";
const ROOM_ID = "c2d3e4f5-a6b7-4c8d-9e0f-1a2b3c4d5e6f";
const FOREIGN_ROOM_ID = "d3e4f5a6-b7c8-4d9e-8f1a-2b3c4d5e6f7a";
const FOREIGN_TYPE_ID = "e4f5a6b7-c8d9-4e0f-8a2b-3c4d5e6f7a8b";

function createHotel(id, ownerUserId) {
    return {
        id,
        ownerUserId,
        name: "Hotel de teste",
        description: null,
        category: "3 estrelas",
        cnpj: "12345678000195",
        email: "hotel@example.com",
        status: "DRAFT",
        isActive: true,
        managers: [
            {
                userId: CO_MANAGER.id,
                user: {
                    id: CO_MANAGER.id,
                    name: "Gestor adicional",
                    email: "co-manager@example.com",
                },
            },
        ],
    };
}

function signInAs(user) {
    auth.mockResolvedValue({ user: { id: user.id } });
    findActiveUser.mockResolvedValue(user);
}

function getRequest(url, method = "GET") {
    return new Request(`http://localhost${url}`, { method });
}

describe("HTTP resource authorization with real guards and services", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        auth.mockReset().mockResolvedValue(null);
        findActiveUser.mockReset();

        state.hotels = new Map([
            [HOTEL_ID, createHotel(HOTEL_ID, OWNER.id)],
            [OTHER_HOTEL_ID, createHotel(OTHER_HOTEL_ID, OTHER_MANAGER.id)],
        ]);
        state.units = new Map([
            [
                UNIT_ID,
                {
                    id: UNIT_ID,
                    hotelId: HOTEL_ID,
                    hotel: state.hotels.get(HOTEL_ID),
                    checkInTime: new Date("1970-01-01T14:00:00.000Z"),
                    checkOutTime: new Date("1970-01-01T12:00:00.000Z"),
                    isActive: true,
                },
            ],
            [
                FOREIGN_UNIT_ID,
                {
                    id: FOREIGN_UNIT_ID,
                    hotelId: OTHER_HOTEL_ID,
                    hotel: state.hotels.get(OTHER_HOTEL_ID),
                    checkInTime: new Date("1970-01-01T14:00:00.000Z"),
                    checkOutTime: new Date("1970-01-01T12:00:00.000Z"),
                    isActive: true,
                },
            ],
        ]);
        state.rooms = new Map([
            [
                ROOM_ID,
                {
                    id: ROOM_ID,
                    unitId: UNIT_ID,
                    roomTypeId: FOREIGN_TYPE_ID,
                    unit: state.units.get(UNIT_ID),
                    roomType: { id: FOREIGN_TYPE_ID, defaultPrice: "300.00" },
                    priceHistory: [],
                },
            ],
            [
                FOREIGN_ROOM_ID,
                {
                    id: FOREIGN_ROOM_ID,
                    unitId: FOREIGN_UNIT_ID,
                    roomTypeId: FOREIGN_TYPE_ID,
                    unit: state.units.get(FOREIGN_UNIT_ID),
                    roomType: { id: FOREIGN_TYPE_ID, defaultPrice: "300.00" },
                    priceHistory: [],
                },
            ],
        ]);
        state.roomTypes = new Map([
            [
                FOREIGN_TYPE_ID,
                {
                    id: FOREIGN_TYPE_ID,
                    hotelId: OTHER_HOTEL_ID,
                    name: "Tipo do outro hotel",
                    description: null,
                    maxGuests: 2,
                    areaM2: "24",
                    defaultPrice: "300",
                    isActive: true,
                    beds: [],
                },
            ],
        ]);
    });

    it("returns 404 HOTEL_NOT_FOUND for another manager's existing hotel", async () => {
        signInAs(OTHER_MANAGER);

        const response = await hotelRoute.GET(
            getRequest(`/api/hotels/${HOTEL_ID}`),
            createRouteContext(HOTEL_ID),
        );

        expect(response.status).toBe(404);
        expect((await response.json()).error.code).toBe("HOTEL_NOT_FOUND");
        expect(repositories.hotel.findByIdWithReviewNotes).toHaveBeenCalledWith(
            HOTEL_ID,
        );
    });

    it("returns the same 404 HOTEL_NOT_FOUND for a hotel that does not exist", async () => {
        signInAs(OWNER);

        const response = await hotelRoute.GET(
            getRequest(`/api/hotels/${MISSING_HOTEL_ID}`),
            createRouteContext(MISSING_HOTEL_ID),
        );

        expect(response.status).toBe(404);
        expect((await response.json()).error.code).toBe("HOTEL_NOT_FOUND");
        expect(repositories.hotel.findByIdWithReviewNotes).toHaveBeenCalledWith(
            MISSING_HOTEL_ID,
        );
    });

    it("hides an existing unit and room when their hotel belongs to another manager", async () => {
        signInAs(OWNER);

        const unitResponse = await unitRoute.GET(
            getRequest(`/api/units/${FOREIGN_UNIT_ID}`),
            createRouteContext(FOREIGN_UNIT_ID),
        );
        const roomResponse = await roomRoute.GET(
            getRequest(`/api/rooms/${FOREIGN_ROOM_ID}`),
            createRouteContext(FOREIGN_ROOM_ID),
        );

        expect(unitResponse.status).toBe(404);
        expect((await unitResponse.json()).error.code).toBe("UNIT_NOT_FOUND");
        expect(repositories.unit.findByIdWithHotel).toHaveBeenCalledWith(
            FOREIGN_UNIT_ID,
        );
        expect(roomResponse.status).toBe(404);
        expect((await roomResponse.json()).error.code).toBe("ROOM_NOT_FOUND");
        expect(repositories.room.findByIdWithAccess).toHaveBeenCalledWith(
            FOREIGN_ROOM_ID,
        );
    });

    it("allows ADMIN to read a hotel globally and a co-manager to read their hotel", async () => {
        signInAs(ADMIN);
        const adminResponse = await hotelRoute.GET(
            getRequest(`/api/hotels/${OTHER_HOTEL_ID}`),
            createRouteContext(OTHER_HOTEL_ID),
        );

        expect(adminResponse.status).toBe(200);
        expect((await adminResponse.json()).data.id).toBe(OTHER_HOTEL_ID);

        signInAs(CO_MANAGER);
        const coManagerResponse = await hotelRoute.GET(
            getRequest(`/api/hotels/${HOTEL_ID}`),
            createRouteContext(HOTEL_ID),
        );
        const coManagedHotel = (await coManagerResponse.json()).data;

        expect(coManagerResponse.status).toBe(200);
        expect(coManagedHotel.id).toBe(HOTEL_ID);
        expect(coManagedHotel).not.toHaveProperty("managers");
    });

    it("rejects ADMIN writes with the real guard before repository access", async () => {
        signInAs(ADMIN);

        const response = await unitRoute.PATCH(
            createJsonRequest(
                `http://localhost/api/units/${UNIT_ID}`,
                "PATCH",
                {
                    name: "Nome atualizado",
                },
            ),
            createRouteContext(UNIT_ID),
        );

        expect(response.status).toBe(403);
        expect((await response.json()).error.code).toBe("FORBIDDEN");
        expect(repositories.unit.findByIdWithHotel).not.toHaveBeenCalled();
        expect(repositories.unit.updateFields).not.toHaveBeenCalled();
    });

    it("rejects a co-manager changing the manager list without writing", async () => {
        signInAs(CO_MANAGER);

        const response = await hotelManagersRoute.POST(
            createJsonRequest(
                `http://localhost/api/hotels/${HOTEL_ID}/managers`,
                "POST",
                { email: "candidate@example.com" },
            ),
            createRouteContext(HOTEL_ID),
        );

        expect(response.status).toBe(404);
        expect((await response.json()).error.code).toBe("HOTEL_NOT_FOUND");
        expect(repositories.hotelManager.create).not.toHaveBeenCalled();
        expect(repositories.user.findByEmail).not.toHaveBeenCalled();
    });

    it("returns ROOM_TYPE_NOT_FOUND and does not create a room for a type from another hotel", async () => {
        signInAs(OWNER);

        const response = await unitRoomsRoute.POST(
            createJsonRequest(
                `http://localhost/api/units/${UNIT_ID}/rooms`,
                "POST",
                {
                    roomTypeId: FOREIGN_TYPE_ID,
                    number: "101",
                    floor: 1,
                    price: 299.9,
                },
            ),
            createRouteContext(UNIT_ID),
        );

        expect(response.status).toBe(404);
        expect((await response.json()).error.code).toBe("ROOM_TYPE_NOT_FOUND");
        expect(repositories.roomType.findById).toHaveBeenCalledWith(
            FOREIGN_TYPE_ID,
            expect.anything(),
        );
        expect(repositories.room.create).not.toHaveBeenCalled();
    });

    it("hides amenities when the parent hotel is outside the manager's scope", async () => {
        signInAs(OWNER);

        const response = await hotelAmenitiesRoute.GET(
            getRequest(`/api/hotels/${OTHER_HOTEL_ID}/amenities`),
            createRouteContext(OTHER_HOTEL_ID),
        );

        expect(response.status).toBe(404);
        expect((await response.json()).error.code).toBe("HOTEL_NOT_FOUND");
        expect(repositories.amenity.listAssociated).not.toHaveBeenCalled();
    });
});
