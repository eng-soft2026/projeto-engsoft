import { beforeEach, describe, expect, it, vi } from "vitest";
import HotelRoomsPage, {
    metadata as roomsMetadata,
} from "../../../src/app/(manager)/manager/hotels/[id]/rooms/page.jsx";
import CreateRoomPage, {
    metadata as createRoomMetadata,
} from "../../../src/app/(manager)/manager/hotels/[id]/rooms/new/page.jsx";
import EditRoomPage, {
    metadata as editRoomMetadata,
} from "../../../src/app/(manager)/manager/hotels/[id]/rooms/[roomId]/page.jsx";
import { AMENITY_TARGETS } from "../../../src/constants/amenity.js";
import { HOTEL_STATUSES } from "../../../src/constants/hotel-statuses.js";
import { ROOM_STATUSES } from "../../../src/constants/room-statuses.js";
import { USER_ROLES } from "../../../src/constants/user-roles.js";
import { ERROR_CODES, NotFoundError } from "../../../src/lib/errors.js";
import { AmenityPicker } from "../../../src/modules/amenities/components/amenity-picker.jsx";
import { DeactivateRoomButton } from "../../../src/modules/rooms/components/deactivate-room-button.jsx";
import {
    ManagedRoomList,
    NewRoomLink,
    UnitSelector,
} from "../../../src/modules/rooms/components/managed-room-list.jsx";
import { RemoveRoomButton } from "../../../src/modules/rooms/components/remove-room-button.jsx";
import { RoomForm } from "../../../src/modules/rooms/components/room-form.jsx";
import { RoomPricePeriodsPanel } from "../../../src/modules/rooms/components/room-price-periods-panel.jsx";

const {
    requirePageRole,
    getHotel,
    listUnits,
    getUnit,
    listRooms,
    getRoom,
    listRoomTypes,
    loadAmenityPickerData,
    listPricePeriods,
    notFound,
    redirect,
} = vi.hoisted(() => ({
    requirePageRole: vi.fn(),
    getHotel: vi.fn(),
    listUnits: vi.fn(),
    getUnit: vi.fn(),
    listRooms: vi.fn(),
    getRoom: vi.fn(),
    listRoomTypes: vi.fn(),
    loadAmenityPickerData: vi.fn(),
    listPricePeriods: vi.fn(),
    notFound: vi.fn(() => {
        throw new Error("NEXT_NOT_FOUND");
    }),
    redirect: vi.fn(() => {
        throw new Error("NEXT_REDIRECT");
    }),
}));

vi.mock("../../../src/modules/auth/guards.js", () => ({ requirePageRole }));
vi.mock("../../../src/services/hotel-service.js", () => ({
    hotelService: { getHotel },
}));
vi.mock("../../../src/services/unit-service.js", () => ({
    unitService: { listUnits, getUnit },
}));
vi.mock("../../../src/services/room-service.js", () => ({
    roomService: { listRooms, getRoom },
}));
vi.mock("../../../src/services/room-type-service.js", () => ({
    roomTypeService: { listRoomTypes },
}));
vi.mock("../../../src/modules/amenities/amenity-picker-data.js", () => ({
    loadAmenityPickerData,
}));
vi.mock("../../../src/services/room-price-period-service.js", () => ({
    roomPricePeriodService: { listPricePeriods },
}));
vi.mock("next/navigation", () => ({ notFound, redirect }));

const MANAGER = Object.freeze({ id: "manager-1", role: USER_ROLES.MANAGER });
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const AMENITY_PICKER_DATA = Object.freeze({
    amenities: [
        { id: "amenity-1", name: "Wi-Fi", isGlobal: true, isActive: true },
    ],
    selectedIds: ["amenity-1"],
});

const HOTEL_ID = "6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const UNIT_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const OTHER_UNIT_ID = "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e";
const ROOM_ID = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

const HOTEL = Object.freeze({
    id: HOTEL_ID,
    ownerUserId: "manager-1",
    name: "Pousada Azul",
    status: HOTEL_STATUSES.DRAFT,
    additionalManagers: [],
});

const UNIT = Object.freeze({
    id: UNIT_ID,
    hotelId: HOTEL_ID,
    name: "Centro",
    isActive: true,
});

const OTHER_UNIT = Object.freeze({
    id: OTHER_UNIT_ID,
    hotelId: HOTEL_ID,
    name: "Praia",
    isActive: false,
});

const ROOM = Object.freeze({
    id: ROOM_ID,
    unitId: UNIT_ID,
    roomTypeId: "type-1",
    number: "101",
    status: ROOM_STATUSES.AVAILABLE,
    isActive: true,
});

const ROOM_TYPES = Object.freeze([
    { id: "type-1", name: "Standard", isActive: true },
    { id: "type-2", name: "Luxo", isActive: false },
]);

function findElementByType(element, type) {
    if (!element || typeof element !== "object") {
        return null;
    }
    if (element.type === type) {
        return element;
    }
    const children = [element.props?.children].flat();
    for (const child of children) {
        const match = findElementByType(child, type);
        if (match) {
            return match;
        }
    }
    return null;
}

function buildParams(extra = {}) {
    return Promise.resolve({ id: HOTEL_ID, ...extra });
}

function mockHotelStatus(status) {
    getHotel.mockResolvedValue({ ...HOTEL, status });
}

beforeEach(() => {
    vi.clearAllMocks();
    requirePageRole.mockResolvedValue(MANAGER);
    listUnits.mockResolvedValue({ items: [UNIT, OTHER_UNIT], total: 2 });
    listRoomTypes.mockResolvedValue({ items: ROOM_TYPES, total: 2 });
    loadAmenityPickerData.mockResolvedValue(AMENITY_PICKER_DATA);
});

describe("HotelRoomsPage", () => {
    it("lists the rooms of the first unit by default", async () => {
        mockHotelStatus(HOTEL_STATUSES.DRAFT);
        listRooms.mockResolvedValue({ items: [ROOM], total: 21 });

        const element = await HotelRoomsPage({
            params: buildParams(),
            searchParams: Promise.resolve({ page: "2" }),
        });

        expect(roomsMetadata.title).toBe("Quartos | Reserva de Hotéis");
        expect(listUnits).toHaveBeenCalledWith(MANAGER, HOTEL_ID, {
            page: 1,
            pageSize: MAX_PAGE_SIZE,
        });
        expect(listRooms).toHaveBeenCalledWith(MANAGER, UNIT_ID, {
            page: 2,
            pageSize: DEFAULT_PAGE_SIZE,
        });
        expect(findElementByType(element, UnitSelector).props).toEqual({
            hotelId: HOTEL_ID,
            units: [UNIT, OTHER_UNIT],
            selectedUnitId: UNIT_ID,
        });
        expect(findElementByType(element, ManagedRoomList).props).toEqual({
            hotelId: HOTEL_ID,
            unitId: UNIT_ID,
            items: [ROOM],
            page: 2,
            pageSize: DEFAULT_PAGE_SIZE,
            total: 21,
            canCreate: true,
        });
        expect(findElementByType(element, NewRoomLink).props).toEqual({
            hotelId: HOTEL_ID,
            unitId: UNIT_ID,
        });
    });

    it("selects the requested unit and blocks creation in an inactive unit", async () => {
        mockHotelStatus(HOTEL_STATUSES.DRAFT);
        listRooms.mockResolvedValue({ items: [], total: 0 });

        const element = await HotelRoomsPage({
            params: buildParams(),
            searchParams: Promise.resolve({ unit: OTHER_UNIT_ID }),
        });

        expect(listRooms).toHaveBeenCalledWith(MANAGER, OTHER_UNIT_ID, {
            page: 1,
            pageSize: DEFAULT_PAGE_SIZE,
        });
        expect(
            findElementByType(element, ManagedRoomList).props.canCreate,
        ).toBe(false);
    });

    it("blocks creation outside draft", async () => {
        mockHotelStatus(HOTEL_STATUSES.PUBLISHED);
        listRooms.mockResolvedValue({ items: [ROOM], total: 1 });

        const element = await HotelRoomsPage({
            params: buildParams(),
            searchParams: Promise.resolve({}),
        });

        expect(
            findElementByType(element, ManagedRoomList).props.canCreate,
        ).toBe(false);
        expect(findElementByType(element, NewRoomLink)).toBeNull();
    });

    it("asks for a unit when the hotel has none", async () => {
        mockHotelStatus(HOTEL_STATUSES.DRAFT);
        listUnits.mockResolvedValue({ items: [], total: 0 });

        const element = await HotelRoomsPage({
            params: buildParams(),
            searchParams: Promise.resolve({}),
        });

        expect(listRooms).not.toHaveBeenCalled();
        expect(findElementByType(element, ManagedRoomList)).toBeNull();
    });
});

describe("CreateRoomPage", () => {
    it("renders the form for an active unit of a draft hotel", async () => {
        mockHotelStatus(HOTEL_STATUSES.DRAFT);
        getUnit.mockResolvedValue(UNIT);

        const element = await CreateRoomPage({
            params: buildParams(),
            searchParams: Promise.resolve({ unit: UNIT_ID }),
        });

        expect(createRoomMetadata.title).toBe(
            "Cadastrar quarto | Reserva de Hotéis",
        );
        expect(getUnit).toHaveBeenCalledWith(MANAGER, UNIT_ID);
        expect(findElementByType(element, RoomForm).props).toEqual({
            hotelId: HOTEL_ID,
            unitId: UNIT_ID,
            roomTypeOptions: [{ value: "type-1", label: "Standard" }],
            isStructureEditable: true,
            isOperationEditable: true,
        });
    });

    it("redirects outside draft", async () => {
        mockHotelStatus(HOTEL_STATUSES.PUBLISHED);

        await expect(
            CreateRoomPage({
                params: buildParams(),
                searchParams: Promise.resolve({ unit: UNIT_ID }),
            }),
        ).rejects.toThrow("NEXT_REDIRECT");
        expect(redirect).toHaveBeenCalledWith(
            `/manager/hotels/${HOTEL_ID}/rooms?unit=${UNIT_ID}`,
        );
    });

    it("redirects when the unit is inactive, missing or from another hotel", async () => {
        mockHotelStatus(HOTEL_STATUSES.DRAFT);
        getUnit.mockResolvedValueOnce(OTHER_UNIT);
        getUnit.mockRejectedValueOnce(
            new NotFoundError(ERROR_CODES.UNIT_NOT_FOUND, "Não encontrada."),
        );
        getUnit.mockResolvedValueOnce({ ...UNIT, hotelId: "other-hotel" });

        for (const unit of [OTHER_UNIT_ID, UNIT_ID, UNIT_ID, "invalid"]) {
            await expect(
                CreateRoomPage({
                    params: buildParams(),
                    searchParams: Promise.resolve({ unit }),
                }),
            ).rejects.toThrow("NEXT_REDIRECT");
        }
        expect(redirect).toHaveBeenNthCalledWith(
            1,
            `/manager/hotels/${HOTEL_ID}/rooms?unit=${OTHER_UNIT_ID}`,
        );
        expect(redirect).toHaveBeenLastCalledWith(
            `/manager/hotels/${HOTEL_ID}/rooms`,
        );
        expect(getUnit).toHaveBeenCalledTimes(3);
    });
});

describe("EditRoomPage", () => {
    const PRICE_PERIODS = [
        {
            id: "period-1",
            roomId: ROOM_ID,
            startDate: "2026-12-20",
            endDate: "2026-12-31",
            price: "480.00",
        },
    ];

    async function renderEditPage(hotelStatus, room = ROOM) {
        mockHotelStatus(hotelStatus);
        listPricePeriods.mockResolvedValue(PRICE_PERIODS);
        getRoom.mockResolvedValue(room);
        getUnit.mockResolvedValue(UNIT);
        return EditRoomPage({ params: buildParams({ roomId: ROOM_ID }) });
    }

    it("allows full editing and removal in draft", async () => {
        const element = await renderEditPage(HOTEL_STATUSES.DRAFT);

        expect(editRoomMetadata.title).toBe(
            "Editar quarto | Reserva de Hotéis",
        );
        expect(getRoom).toHaveBeenCalledWith(MANAGER, ROOM_ID);
        expect(getUnit).toHaveBeenCalledWith(MANAGER, UNIT_ID);
        expect(findElementByType(element, RoomForm).props).toEqual({
            hotelId: HOTEL_ID,
            room: ROOM,
            roomTypeOptions: [{ value: "type-1", label: "Standard" }],
            isStructureEditable: true,
            isOperationEditable: true,
        });
        expect(findElementByType(element, RemoveRoomButton)).not.toBeNull();
        expect(findElementByType(element, DeactivateRoomButton)).toBeNull();
        expect(loadAmenityPickerData).toHaveBeenCalledWith(
            MANAGER,
            AMENITY_TARGETS.ROOM,
            ROOM_ID,
        );
        expect(findElementByType(element, AmenityPicker).props).toEqual({
            target: AMENITY_TARGETS.ROOM,
            targetId: ROOM_ID,
            isEditable: true,
            ...AMENITY_PICKER_DATA,
        });
        expect(listPricePeriods).toHaveBeenCalledWith(MANAGER, ROOM_ID);
        expect(findElementByType(element, RoomPricePeriodsPanel).props).toEqual(
            {
                roomId: ROOM_ID,
                periods: PRICE_PERIODS,
                today: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
                isEditable: true,
            },
        );
    });

    it("allows only the daily operation in a published hotel", async () => {
        const element = await renderEditPage(HOTEL_STATUSES.PUBLISHED, {
            ...ROOM,
            roomTypeId: "type-2",
        });

        const formProps = findElementByType(element, RoomForm).props;
        expect(formProps.isStructureEditable).toBe(false);
        expect(formProps.isOperationEditable).toBe(true);
        expect(formProps.roomTypeOptions).toEqual([
            { value: "type-1", label: "Standard" },
            { value: "type-2", label: "Luxo (inativo)" },
        ]);
        expect(findElementByType(element, DeactivateRoomButton)).not.toBeNull();
        expect(findElementByType(element, RemoveRoomButton)).not.toBeNull();
        expect(findElementByType(element, AmenityPicker).props.isEditable).toBe(
            false,
        );
        expect(
            findElementByType(element, RoomPricePeriodsPanel).props.isEditable,
        ).toBe(true);
    });

    it("is read only for an inactive room or a hotel under review", async () => {
        for (const [status, room] of [
            [HOTEL_STATUSES.PUBLISHED, { ...ROOM, isActive: false }],
            [HOTEL_STATUSES.UNDER_REVIEW, ROOM],
        ]) {
            const element = await renderEditPage(status, room);
            const formProps = findElementByType(element, RoomForm).props;

            expect(formProps.isStructureEditable).toBe(false);
            expect(formProps.isOperationEditable).toBe(false);
            expect(findElementByType(element, RemoveRoomButton)).toBeNull();
            expect(
                findElementByType(element, RoomPricePeriodsPanel).props
                    .isEditable,
            ).toBe(false);
        }
    });

    it("answers 404 for an invalid id, a missing room or another hotel", async () => {
        mockHotelStatus(HOTEL_STATUSES.DRAFT);
        await expect(
            EditRoomPage({ params: buildParams({ roomId: "invalid" }) }),
        ).rejects.toThrow("NEXT_NOT_FOUND");

        getRoom.mockRejectedValueOnce(
            new NotFoundError(ERROR_CODES.ROOM_NOT_FOUND, "Não encontrado."),
        );
        await expect(
            EditRoomPage({ params: buildParams({ roomId: ROOM_ID }) }),
        ).rejects.toThrow("NEXT_NOT_FOUND");

        getRoom.mockResolvedValueOnce(ROOM);
        getUnit.mockResolvedValueOnce({ ...UNIT, hotelId: "other-hotel" });
        await expect(
            EditRoomPage({ params: buildParams({ roomId: ROOM_ID }) }),
        ).rejects.toThrow("NEXT_NOT_FOUND");
    });
});
