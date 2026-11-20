import { HOTEL_STATUSES } from "../constants/hotel-statuses.js";
import { ROOM_STATUSES } from "../constants/room-statuses.js";
import { getPrisma } from "../lib/prisma.js";

const PUBLISHED_HOTEL_WHERE = Object.freeze({
    status: HOTEL_STATUSES.PUBLISHED,
    isActive: true,
});

const PUBLIC_UNIT_WHERE = Object.freeze({
    isActive: true,
    hotel: PUBLISHED_HOTEL_WHERE,
});

const PUBLIC_ROOM_WHERE = Object.freeze({
    isActive: true,
    status: ROOM_STATUSES.AVAILABLE,
    roomType: { isActive: true },
});

const POSITION_ORDER = Object.freeze([{ position: "asc" }, { id: "asc" }]);

const COVER_IMAGE_FIELDS = Object.freeze({
    id: true,
    url: true,
    isCover: true,
    position: true,
    width: true,
    height: true,
});

const IMAGE_FIELDS = Object.freeze({
    id: true,
    url: true,
    position: true,
    width: true,
    height: true,
});

const AMENITY_LINK_SELECT = Object.freeze({
    where: { amenity: { isActive: true } },
    select: { amenity: { select: { id: true, name: true } } },
    orderBy: { amenity: { name: "asc" } },
});

const HOTEL_SUMMARY_FIELDS = Object.freeze({
    id: true,
    name: true,
    category: true,
});

const LOCATION_FIELDS = Object.freeze({
    neighborhood: true,
    city: true,
    state: true,
    latitude: true,
    longitude: true,
});

const OPEN_PRICE_SELECT = Object.freeze({
    where: { validUntil: null },
    select: { price: true },
    take: 1,
});

const ROOM_SUMMARY_FIELDS = Object.freeze({
    id: true,
    number: true,
    floor: true,
    isAccessible: true,
    roomType: {
        select: {
            id: true,
            name: true,
            maxGuests: true,
            areaM2: true,
            defaultPrice: true,
        },
    },
    priceHistory: OPEN_PRICE_SELECT,
});

const PUBLIC_HOTEL_FIELDS = Object.freeze({
    ...HOTEL_SUMMARY_FIELDS,
    description: true,
    images: { select: COVER_IMAGE_FIELDS, orderBy: POSITION_ORDER },
    amenities: AMENITY_LINK_SELECT,
    acceptances: {
        select: {
            id: true,
            customLabel: true,
            isAllowed: true,
            details: true,
            acceptanceType: { select: { code: true, name: true } },
        },
        orderBy: [{ acceptanceType: { code: "asc" } }, { customLabel: "asc" }],
    },
    policies: {
        where: { isActive: true },
        select: { id: true, type: true, title: true, description: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    },
    units: {
        where: { isActive: true },
        select: {
            id: true,
            name: true,
            address: { select: LOCATION_FIELDS },
            images: {
                where: { isCover: true },
                select: COVER_IMAGE_FIELDS,
                take: 1,
            },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    },
});

const PUBLIC_UNIT_FIELDS = Object.freeze({
    id: true,
    name: true,
    email: true,
    checkInTime: true,
    checkOutTime: true,
    address: {
        select: {
            zipCode: true,
            street: true,
            number: true,
            complement: true,
            ...LOCATION_FIELDS,
        },
    },
    phones: {
        select: { id: true, phone: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    },
    images: { select: COVER_IMAGE_FIELDS, orderBy: POSITION_ORDER },
    amenities: AMENITY_LINK_SELECT,
    hotel: { select: HOTEL_SUMMARY_FIELDS },
    rooms: {
        where: PUBLIC_ROOM_WHERE,
        select: ROOM_SUMMARY_FIELDS,
        orderBy: [{ number: "asc" }, { id: "asc" }],
    },
});

const PUBLIC_ROOM_FIELDS = Object.freeze({
    id: true,
    number: true,
    floor: true,
    isAccessible: true,
    amenities: AMENITY_LINK_SELECT,
    priceHistory: OPEN_PRICE_SELECT,
    roomType: {
        select: {
            id: true,
            name: true,
            description: true,
            maxGuests: true,
            areaM2: true,
            defaultPrice: true,
            beds: {
                select: { bedType: true, quantity: true },
                orderBy: { bedType: "asc" },
            },
            amenities: AMENITY_LINK_SELECT,
            images: { select: IMAGE_FIELDS, orderBy: POSITION_ORDER },
        },
    },
    unit: {
        select: {
            id: true,
            name: true,
            checkInTime: true,
            checkOutTime: true,
            address: { select: LOCATION_FIELDS },
            hotel: { select: HOTEL_SUMMARY_FIELDS },
        },
    },
});

export function createPublicCatalogRepository(getClient = getPrisma) {
    return Object.freeze({
        findPublishedHotel(id, client = getClient()) {
            return client.hotel.findFirst({
                where: { id, ...PUBLISHED_HOTEL_WHERE },
                select: PUBLIC_HOTEL_FIELDS,
            });
        },

        findPublishedUnit(id, client = getClient()) {
            return client.hotelUnit.findFirst({
                where: { id, ...PUBLIC_UNIT_WHERE },
                select: PUBLIC_UNIT_FIELDS,
            });
        },

        findPublishedRoom(id, client = getClient()) {
            return client.room.findFirst({
                where: { id, ...PUBLIC_ROOM_WHERE, unit: PUBLIC_UNIT_WHERE },
                select: PUBLIC_ROOM_FIELDS,
            });
        },
    });
}

export const publicCatalogRepository = createPublicCatalogRepository();
