import { describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "../../src/lib/errors.js";
import { createPublicCatalogService } from "../../src/services/public-catalog-service.js";

const HOTEL_ID = "3f1c2a4e-8b7d-4c6a-9e21-5d0b7a1c9f33";
const UNIT_ID = "7a1c9f33-8b7d-4c6a-9e21-3f1c2a4e5d0b";
const ROOM_ID = "c1c9f33a-8b7d-4c6a-9e21-3f1c2a4e0002";
const TYPE_ID = "a1b2c3d4-8b7d-4c6a-9e21-3f1c2a4e0003";

const FORBIDDEN_KEYS = Object.freeze([
    "cnpj",
    "ownerUserId",
    "owner",
    "managers",
    "reviewNotes",
    "status",
    "isActive",
    "administrativeNotes",
    "overbookingPercentage",
    "cloudinaryPublicId",
    "passwordHash",
    "priceHistory",
]);

const HOTEL_SUMMARY = Object.freeze({
    id: HOTEL_ID,
    name: "Hotel Mar Azul",
    category: "Pousada",
});

const IMAGE = Object.freeze({
    id: "image-1",
    url: "https://res.cloudinary.com/demo/image/upload/foto.jpg",
    isCover: true,
    position: 0,
    width: 1600,
    height: 900,
});

const AMENITY_LINKS = Object.freeze([
    { amenity: { id: "amenity-1", name: "Piscina" } },
]);

const LOCATION = Object.freeze({
    neighborhood: "Centro",
    city: "Ubatuba",
    state: "SP",
    latitude: { toString: () => "-23.433200" },
    longitude: { toString: () => "-45.071100" },
});

function buildHotelRow() {
    return {
        ...HOTEL_SUMMARY,
        description: "Pousada de frente para o mar.",
        images: [IMAGE],
        amenities: AMENITY_LINKS,
        acceptances: [
            {
                id: "acceptance-1",
                customLabel: null,
                isAllowed: true,
                details: null,
                acceptanceType: { code: "PETS", name: "Animais" },
            },
        ],
        policies: [
            {
                id: "policy-1",
                type: "QUIET_HOURS",
                title: "Silêncio",
                description: "Das 22h às 8h.",
            },
        ],
        units: [
            {
                id: UNIT_ID,
                name: "Unidade Praia",
                address: LOCATION,
                images: [IMAGE],
            },
        ],
    };
}

function buildRoomSummaryRow(overrides = {}) {
    return {
        id: ROOM_ID,
        number: "101",
        floor: 1,
        isAccessible: false,
        roomType: {
            id: TYPE_ID,
            name: "Suíte",
            maxGuests: 2,
            areaM2: "25.5",
            defaultPrice: "350",
        },
        priceHistory: [],
        ...overrides,
    };
}

function buildUnitRow() {
    return {
        id: UNIT_ID,
        name: "Unidade Praia",
        email: "praia@example.com",
        checkInTime: new Date("1970-01-01T14:00:00.000Z"),
        checkOutTime: new Date("1970-01-01T11:00:00.000Z"),
        address: {
            zipCode: "11680000",
            street: "Rua das Ondas",
            number: "100",
            complement: null,
            ...LOCATION,
        },
        phones: [{ id: "phone-1", phone: "1238320000" }],
        images: [IMAGE],
        amenities: AMENITY_LINKS,
        hotel: HOTEL_SUMMARY,
        rooms: [
            buildRoomSummaryRow(),
            buildRoomSummaryRow({
                id: "room-2",
                number: "102",
                priceHistory: [{ price: "410" }],
            }),
        ],
    };
}

function buildRoomRow(overrides = {}) {
    return {
        id: ROOM_ID,
        number: "101",
        floor: 1,
        isAccessible: true,
        amenities: AMENITY_LINKS,
        priceHistory: [],
        roomType: {
            id: TYPE_ID,
            name: "Suíte",
            description: "Suíte com varanda.",
            maxGuests: 2,
            areaM2: "25.5",
            defaultPrice: "350",
            beds: [{ bedType: "QUEEN", quantity: 1 }],
            amenities: AMENITY_LINKS,
            images: [
                {
                    id: "image-2",
                    url: IMAGE.url,
                    position: 0,
                    width: 1600,
                    height: 900,
                },
            ],
        },
        unit: {
            id: UNIT_ID,
            name: "Unidade Praia",
            checkInTime: new Date("1970-01-01T14:00:00.000Z"),
            checkOutTime: new Date("1970-01-01T11:00:00.000Z"),
            address: LOCATION,
            hotel: HOTEL_SUMMARY,
        },
        ...overrides,
    };
}

function createWorld({ hotel = null, unit = null, room = null } = {}) {
    const publicCatalogRepository = {
        findPublishedHotel: vi.fn().mockResolvedValue(hotel),
        findPublishedUnit: vi.fn().mockResolvedValue(unit),
        findPublishedRoom: vi.fn().mockResolvedValue(room),
    };
    const service = createPublicCatalogService({ publicCatalogRepository });
    return { service, publicCatalogRepository };
}

function collectKeys(value, keys = new Set()) {
    if (Array.isArray(value)) {
        value.forEach((item) => collectKeys(item, keys));
        return keys;
    }
    if (value && typeof value === "object") {
        for (const [key, nested] of Object.entries(value)) {
            keys.add(key);
            collectKeys(nested, keys);
        }
    }
    return keys;
}

function expectNoForbiddenKeys(value) {
    const keys = collectKeys(value);
    for (const key of FORBIDDEN_KEYS) {
        expect(keys.has(key), key).toBe(false);
    }
}

describe("publicCatalogService.getHotel", () => {
    it("answers 404 HOTEL_NOT_FOUND when the repository finds no published hotel", async () => {
        const { service, publicCatalogRepository } = createWorld();

        await expect(service.getHotel(HOTEL_ID)).rejects.toMatchObject({
            code: ERROR_CODES.HOTEL_NOT_FOUND,
            name: "NotFoundError",
        });
        expect(publicCatalogRepository.findPublishedHotel).toHaveBeenCalledWith(
            HOTEL_ID,
        );
    });

    it("returns the public hotel with an empty rating and flattened amenities", async () => {
        const { service } = createWorld({ hotel: buildHotelRow() });

        const hotel = await service.getHotel(HOTEL_ID);

        expect(hotel.rating).toEqual({ average: null, count: 0 });
        expect(hotel.amenities).toEqual([{ id: "amenity-1", name: "Piscina" }]);
        expect(hotel.acceptances).toEqual([
            {
                id: "acceptance-1",
                type: "PETS",
                typeName: "Animais",
                customLabel: null,
                isAllowed: true,
                details: null,
            },
        ]);
        expect(hotel.units).toEqual([
            {
                id: UNIT_ID,
                name: "Unidade Praia",
                address: {
                    neighborhood: "Centro",
                    city: "Ubatuba",
                    state: "SP",
                    latitude: "-23.433200",
                    longitude: "-45.071100",
                },
                coverImage: IMAGE,
            },
        ]);
    });

    it("exposes only the public hotel keys", async () => {
        const { service } = createWorld({ hotel: buildHotelRow() });

        const hotel = await service.getHotel(HOTEL_ID);

        expect(Object.keys(hotel).sort()).toEqual([
            "acceptances",
            "amenities",
            "category",
            "description",
            "id",
            "images",
            "name",
            "policies",
            "rating",
            "units",
        ]);
        expect(collectKeys(hotel).has("email")).toBe(false);
        expectNoForbiddenKeys(hotel);
    });

    it("returns a null cover and a null address for a unit without them", async () => {
        const row = buildHotelRow();
        row.units = [
            { id: UNIT_ID, name: "Sem foto", address: null, images: [] },
        ];
        const { service } = createWorld({ hotel: row });

        const hotel = await service.getHotel(HOTEL_ID);

        expect(hotel.units[0]).toMatchObject({
            address: null,
            coverImage: null,
        });
    });
});

describe("publicCatalogService.getUnit", () => {
    it("answers 404 UNIT_NOT_FOUND when the unit is not public", async () => {
        const { service } = createWorld();

        await expect(service.getUnit(UNIT_ID)).rejects.toMatchObject({
            code: ERROR_CODES.UNIT_NOT_FOUND,
            name: "NotFoundError",
        });
    });

    it("formats times, coordinates and the room base price", async () => {
        const { service } = createWorld({ unit: buildUnitRow() });

        const unit = await service.getUnit(UNIT_ID);

        expect(unit.checkInTime).toBe("14:00");
        expect(unit.checkOutTime).toBe("11:00");
        expect(unit.address.latitude).toBe("-23.433200");
        expect(unit.rooms.map((room) => room.effectivePrice)).toEqual([
            "350.00",
            "410.00",
        ]);
        expect(unit.rooms[0].roomType).toEqual({
            id: TYPE_ID,
            name: "Suíte",
            maxGuests: 2,
            areaM2: "25.50",
        });
    });

    it("keeps null coordinates while the unit is not geocoded", async () => {
        const row = buildUnitRow();
        row.address = { ...row.address, latitude: null, longitude: null };
        const { service } = createWorld({ unit: row });

        const unit = await service.getUnit(UNIT_ID);

        expect(unit.address).toMatchObject({ latitude: null, longitude: null });
    });

    it("exposes only the public unit keys", async () => {
        const { service } = createWorld({ unit: buildUnitRow() });

        const unit = await service.getUnit(UNIT_ID);

        expect(Object.keys(unit).sort()).toEqual([
            "address",
            "amenities",
            "checkInTime",
            "checkOutTime",
            "email",
            "hotel",
            "id",
            "images",
            "name",
            "phones",
            "rooms",
        ]);
        expect(Object.keys(unit.rooms[0]).sort()).toEqual([
            "effectivePrice",
            "floor",
            "id",
            "isAccessible",
            "number",
            "roomType",
        ]);
        expectNoForbiddenKeys(unit);
    });
});

describe("publicCatalogService.getRoom", () => {
    it("answers 404 ROOM_NOT_FOUND when the room is not public", async () => {
        const { service } = createWorld();

        await expect(service.getRoom(ROOM_ID)).rejects.toMatchObject({
            code: ERROR_CODES.ROOM_NOT_FOUND,
            name: "NotFoundError",
        });
    });

    it("uses the room price over the type default price", async () => {
        const { service: withTypePrice } = createWorld({
            room: buildRoomRow(),
        });
        const { service: withRoomPrice } = createWorld({
            room: buildRoomRow({ priceHistory: [{ price: "299.9" }] }),
        });

        const typePriced = await withTypePrice.getRoom(ROOM_ID);
        const roomPriced = await withRoomPrice.getRoom(ROOM_ID);

        expect(typePriced.effectivePrice).toBe("350.00");
        expect(roomPriced.effectivePrice).toBe("299.90");
    });

    it("returns the type details, the type photos and the unit and hotel summaries", async () => {
        const { service } = createWorld({ room: buildRoomRow() });

        const room = await service.getRoom(ROOM_ID);

        expect(room.roomType).toMatchObject({
            areaM2: "25.50",
            beds: [{ bedType: "QUEEN", quantity: 1 }],
            amenities: [{ id: "amenity-1", name: "Piscina" }],
        });
        expect(room.roomType.images).toHaveLength(1);
        expect(room.unit).toMatchObject({
            checkInTime: "14:00",
            checkOutTime: "11:00",
        });
        expect(room.hotel).toEqual(HOTEL_SUMMARY);
    });

    it("exposes only the public room keys", async () => {
        const { service } = createWorld({ room: buildRoomRow() });

        const room = await service.getRoom(ROOM_ID);

        expect(Object.keys(room).sort()).toEqual([
            "amenities",
            "effectivePrice",
            "floor",
            "hotel",
            "id",
            "isAccessible",
            "number",
            "roomType",
            "unit",
        ]);
        expect(Object.keys(room.roomType)).not.toContain("defaultPrice");
        expectNoForbiddenKeys(room);
    });
});
