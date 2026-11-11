import { beforeEach, describe, expect, it, vi } from "vitest";
import HotelRoomTypesPage, {
    metadata as roomTypesMetadata,
} from "../../../src/app/(manager)/manager/hotels/[id]/room-types/page.jsx";
import CreateRoomTypePage, {
    metadata as createRoomTypeMetadata,
} from "../../../src/app/(manager)/manager/hotels/[id]/room-types/new/page.jsx";
import EditRoomTypePage, {
    metadata as editRoomTypeMetadata,
} from "../../../src/app/(manager)/manager/hotels/[id]/room-types/[roomTypeId]/page.jsx";
import { AMENITY_TARGETS } from "../../../src/constants/amenity.js";
import { HOTEL_STATUSES } from "../../../src/constants/hotel-statuses.js";
import { USER_ROLES } from "../../../src/constants/user-roles.js";
import { ERROR_CODES, NotFoundError } from "../../../src/lib/errors.js";
import {
    ManagedRoomTypeList,
    NewRoomTypeLink,
} from "../../../src/modules/room-types/components/managed-room-type-list.jsx";
import { AmenityPicker } from "../../../src/modules/amenities/components/amenity-picker.jsx";
import { RemoveRoomTypeButton } from "../../../src/modules/room-types/components/remove-room-type-button.jsx";
import { RoomTypeForm } from "../../../src/modules/room-types/components/room-type-form.jsx";

const {
    requirePageRole,
    getHotel,
    listRoomTypes,
    getRoomType,
    loadAmenityPickerData,
    notFound,
    redirect,
} = vi.hoisted(() => ({
    requirePageRole: vi.fn(),
    getHotel: vi.fn(),
    listRoomTypes: vi.fn(),
    getRoomType: vi.fn(),
    loadAmenityPickerData: vi.fn(),
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
vi.mock("../../../src/services/room-type-service.js", () => ({
    roomTypeService: { listRoomTypes, getRoomType },
}));
vi.mock("../../../src/modules/amenities/amenity-picker-data.js", () => ({
    loadAmenityPickerData,
}));
vi.mock("next/navigation", () => ({ notFound, redirect }));

const MANAGER = Object.freeze({ id: "manager-1", role: USER_ROLES.MANAGER });
const DEFAULT_PAGE_SIZE = 20;
const AMENITY_PICKER_DATA = Object.freeze({
    amenities: [
        { id: "amenity-1", name: "Wi-Fi", isGlobal: true, isActive: true },
    ],
    selectedIds: ["amenity-1"],
});

const HOTEL_ID = "6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const ROOM_TYPE_ID = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

const HOTEL = Object.freeze({
    id: HOTEL_ID,
    ownerUserId: "manager-1",
    name: "Pousada Azul",
    status: HOTEL_STATUSES.DRAFT,
    additionalManagers: [],
});

const ROOM_TYPE = Object.freeze({
    id: ROOM_TYPE_ID,
    hotelId: HOTEL_ID,
    name: "Suíte Luxo",
    isActive: true,
});

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
    loadAmenityPickerData.mockResolvedValue(AMENITY_PICKER_DATA);
});

describe("HotelRoomTypesPage", () => {
    const ROOM_TYPES = Object.freeze([ROOM_TYPE]);

    it("lists the hotel room types of the requested page", async () => {
        mockHotelStatus(HOTEL_STATUSES.DRAFT);
        listRoomTypes.mockResolvedValue({ items: ROOM_TYPES, total: 21 });

        const element = await HotelRoomTypesPage({
            params: buildParams(),
            searchParams: Promise.resolve({ page: "2" }),
        });

        expect(roomTypesMetadata.title).toBe(
            "Tipos de acomodação | Reserva de Hotéis",
        );
        expect(listRoomTypes).toHaveBeenCalledWith(MANAGER, HOTEL_ID, {
            page: 2,
            pageSize: DEFAULT_PAGE_SIZE,
        });
        expect(findElementByType(element, ManagedRoomTypeList).props).toEqual({
            hotelId: HOTEL_ID,
            items: ROOM_TYPES,
            page: 2,
            pageSize: DEFAULT_PAGE_SIZE,
            total: 21,
            isEditable: true,
        });
        expect(findElementByType(element, NewRoomTypeLink).props).toEqual({
            hotelId: HOTEL_ID,
        });
    });

    it("hides the create link outside draft", async () => {
        mockHotelStatus(HOTEL_STATUSES.PUBLISHED);
        listRoomTypes.mockResolvedValue({ items: ROOM_TYPES, total: 1 });

        const element = await HotelRoomTypesPage({
            params: buildParams(),
            searchParams: Promise.resolve({ page: "abc" }),
        });

        expect(listRoomTypes).toHaveBeenCalledWith(MANAGER, HOTEL_ID, {
            page: 1,
            pageSize: DEFAULT_PAGE_SIZE,
        });
        expect(
            findElementByType(element, ManagedRoomTypeList).props.isEditable,
        ).toBe(false);
        expect(findElementByType(element, NewRoomTypeLink)).toBeNull();
    });
});

describe("CreateRoomTypePage", () => {
    it("renders the create form for a draft hotel", async () => {
        mockHotelStatus(HOTEL_STATUSES.DRAFT);

        const element = await CreateRoomTypePage({ params: buildParams() });

        expect(createRoomTypeMetadata.title).toBe(
            "Cadastrar tipo de acomodação | Reserva de Hotéis",
        );
        expect(findElementByType(element, RoomTypeForm).props).toEqual({
            hotelId: HOTEL_ID,
            isStructureEditable: true,
            isPriceEditable: true,
        });
    });

    it("redirects to the list outside draft", async () => {
        mockHotelStatus(HOTEL_STATUSES.PUBLISHED);

        await expect(
            CreateRoomTypePage({ params: buildParams() }),
        ).rejects.toThrow("NEXT_REDIRECT");
        expect(redirect).toHaveBeenCalledWith(
            `/manager/hotels/${HOTEL_ID}/room-types`,
        );
    });
});

describe("EditRoomTypePage", () => {
    function renderEditPage(roomTypeId = ROOM_TYPE_ID) {
        return EditRoomTypePage({ params: buildParams({ roomTypeId }) });
    }

    it("edits everything and offers removal in draft", async () => {
        mockHotelStatus(HOTEL_STATUSES.DRAFT);
        getRoomType.mockResolvedValue(ROOM_TYPE);

        const element = await renderEditPage();

        expect(editRoomTypeMetadata.title).toBe(
            "Editar tipo de acomodação | Reserva de Hotéis",
        );
        expect(getRoomType).toHaveBeenCalledWith(MANAGER, ROOM_TYPE_ID);
        expect(findElementByType(element, RoomTypeForm).props).toEqual({
            hotelId: HOTEL_ID,
            roomType: ROOM_TYPE,
            isStructureEditable: true,
            isPriceEditable: true,
        });
        expect(findElementByType(element, RemoveRoomTypeButton).props).toEqual({
            hotelId: HOTEL_ID,
            roomType: ROOM_TYPE,
        });
        expect(loadAmenityPickerData).toHaveBeenCalledWith(
            MANAGER,
            AMENITY_TARGETS.ROOM_TYPE,
            ROOM_TYPE_ID,
        );
        expect(findElementByType(element, AmenityPicker).props).toEqual({
            target: AMENITY_TARGETS.ROOM_TYPE,
            targetId: ROOM_TYPE_ID,
            isEditable: true,
            ...AMENITY_PICKER_DATA,
        });
    });

    it("allows only the default price in a published hotel", async () => {
        mockHotelStatus(HOTEL_STATUSES.PUBLISHED);
        getRoomType.mockResolvedValue(ROOM_TYPE);

        const element = await renderEditPage();

        expect(findElementByType(element, RoomTypeForm).props).toMatchObject({
            isStructureEditable: false,
            isPriceEditable: true,
        });
        expect(findElementByType(element, RemoveRoomTypeButton)).toBeNull();
        expect(findElementByType(element, AmenityPicker).props.isEditable).toBe(
            false,
        );
    });

    it.each([HOTEL_STATUSES.UNDER_REVIEW, HOTEL_STATUSES.BLOCKED])(
        "is read-only with the hotel %s",
        async (status) => {
            mockHotelStatus(status);
            getRoomType.mockResolvedValue(ROOM_TYPE);

            const element = await renderEditPage();

            expect(
                findElementByType(element, RoomTypeForm).props,
            ).toMatchObject({
                isStructureEditable: false,
                isPriceEditable: false,
            });
        },
    );

    it("is read-only for an inactive room type", async () => {
        mockHotelStatus(HOTEL_STATUSES.DRAFT);
        getRoomType.mockResolvedValue({ ...ROOM_TYPE, isActive: false });

        const element = await renderEditPage();

        expect(findElementByType(element, RoomTypeForm).props).toMatchObject({
            isStructureEditable: false,
            isPriceEditable: false,
        });
        expect(findElementByType(element, RemoveRoomTypeButton)).toBeNull();
        expect(findElementByType(element, AmenityPicker).props.isEditable).toBe(
            false,
        );
    });

    it("answers not found for an invalid identifier", async () => {
        mockHotelStatus(HOTEL_STATUSES.DRAFT);

        await expect(renderEditPage("abc")).rejects.toThrow("NEXT_NOT_FOUND");
        expect(getRoomType).not.toHaveBeenCalled();
    });

    it("answers not found when the service hides the room type", async () => {
        mockHotelStatus(HOTEL_STATUSES.DRAFT);
        getRoomType.mockRejectedValue(
            new NotFoundError(
                ERROR_CODES.ROOM_TYPE_NOT_FOUND,
                "Tipo de acomodação não encontrado.",
            ),
        );

        await expect(renderEditPage()).rejects.toThrow("NEXT_NOT_FOUND");
    });

    it("answers not found for a room type of another hotel", async () => {
        mockHotelStatus(HOTEL_STATUSES.DRAFT);
        getRoomType.mockResolvedValue({ ...ROOM_TYPE, hotelId: "other" });

        await expect(renderEditPage()).rejects.toThrow("NEXT_NOT_FOUND");
    });

    it("rethrows unexpected errors", async () => {
        mockHotelStatus(HOTEL_STATUSES.DRAFT);
        getRoomType.mockRejectedValue(new Error("database down"));

        await expect(renderEditPage()).rejects.toThrow("database down");
    });
});
