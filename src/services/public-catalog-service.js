import { ERROR_CODES, NotFoundError } from "../lib/errors.js";
import { publicCatalogRepository as defaultPublicCatalogRepository } from "../repositories/public-catalog-repository.js";
import { formatDecimal } from "../utils/money.js";
import { dateToTimeOfDay } from "../utils/time-of-day.js";

const EMPTY_RATING = Object.freeze({ average: null, count: 0 });

function createHotelNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.HOTEL_NOT_FOUND,
        "Hotel não encontrado.",
    );
}

function createUnitNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.UNIT_NOT_FOUND,
        "Unidade não encontrada.",
    );
}

function createRoomNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.ROOM_NOT_FOUND,
        "Quarto não encontrado.",
    );
}

function presentAmenities(links) {
    return links.map(({ amenity }) => ({ id: amenity.id, name: amenity.name }));
}

function presentCoordinate(value) {
    if (value === null || value === undefined) {
        return null;
    }
    return value.toString();
}

function presentLocation(address) {
    if (!address) {
        return null;
    }
    return {
        ...address,
        latitude: presentCoordinate(address.latitude),
        longitude: presentCoordinate(address.longitude),
    };
}

function presentAcceptance({
    id,
    acceptanceType,
    customLabel,
    isAllowed,
    details,
}) {
    return {
        id,
        type: acceptanceType.code,
        typeName: acceptanceType.name,
        customLabel,
        isAllowed,
        details,
    };
}

function resolveEffectivePrice(priceHistory, defaultPrice) {
    const [openPrice] = priceHistory;
    return formatDecimal(openPrice?.price ?? defaultPrice);
}

function presentRoomSummary({
    id,
    number,
    floor,
    isAccessible,
    roomType,
    priceHistory,
}) {
    return {
        id,
        number,
        floor,
        isAccessible,
        effectivePrice: resolveEffectivePrice(
            priceHistory,
            roomType.defaultPrice,
        ),
        roomType: {
            id: roomType.id,
            name: roomType.name,
            maxGuests: roomType.maxGuests,
            areaM2: formatDecimal(roomType.areaM2),
        },
    };
}

function presentHotel(hotel) {
    return {
        id: hotel.id,
        name: hotel.name,
        description: hotel.description,
        category: hotel.category,
        rating: { ...EMPTY_RATING },
        images: hotel.images,
        amenities: presentAmenities(hotel.amenities),
        acceptances: hotel.acceptances.map(presentAcceptance),
        policies: hotel.policies,
        units: hotel.units.map(({ id, name, address, images }) => ({
            id,
            name,
            address: presentLocation(address),
            coverImage: images[0] ?? null,
        })),
    };
}

function presentUnit(unit) {
    return {
        id: unit.id,
        name: unit.name,
        email: unit.email,
        checkInTime: dateToTimeOfDay(unit.checkInTime),
        checkOutTime: dateToTimeOfDay(unit.checkOutTime),
        address: presentLocation(unit.address),
        phones: unit.phones,
        images: unit.images,
        amenities: presentAmenities(unit.amenities),
        hotel: unit.hotel,
        rooms: unit.rooms.map(presentRoomSummary),
    };
}

function presentRoom(room) {
    const { roomType, unit } = room;
    return {
        id: room.id,
        number: room.number,
        floor: room.floor,
        isAccessible: room.isAccessible,
        effectivePrice: resolveEffectivePrice(
            room.priceHistory,
            roomType.defaultPrice,
        ),
        amenities: presentAmenities(room.amenities),
        roomType: {
            id: roomType.id,
            name: roomType.name,
            description: roomType.description,
            maxGuests: roomType.maxGuests,
            areaM2: formatDecimal(roomType.areaM2),
            beds: roomType.beds,
            amenities: presentAmenities(roomType.amenities),
            images: roomType.images,
        },
        unit: {
            id: unit.id,
            name: unit.name,
            checkInTime: dateToTimeOfDay(unit.checkInTime),
            checkOutTime: dateToTimeOfDay(unit.checkOutTime),
            address: presentLocation(unit.address),
        },
        hotel: unit.hotel,
    };
}

export function createPublicCatalogService({ publicCatalogRepository }) {
    async function getHotel(hotelId) {
        const hotel = await publicCatalogRepository.findPublishedHotel(hotelId);
        if (!hotel) {
            throw createHotelNotFoundError();
        }
        return presentHotel(hotel);
    }

    async function getUnit(unitId) {
        const unit = await publicCatalogRepository.findPublishedUnit(unitId);
        if (!unit) {
            throw createUnitNotFoundError();
        }
        return presentUnit(unit);
    }

    async function getRoom(roomId) {
        const room = await publicCatalogRepository.findPublishedRoom(roomId);
        if (!room) {
            throw createRoomNotFoundError();
        }
        return presentRoom(room);
    }

    return Object.freeze({ getHotel, getUnit, getRoom });
}

export const publicCatalogService = createPublicCatalogService({
    publicCatalogRepository: defaultPublicCatalogRepository,
});
