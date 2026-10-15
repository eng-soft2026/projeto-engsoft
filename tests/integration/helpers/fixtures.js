import { randomInt, randomUUID } from "node:crypto";
import { USER_ROLES } from "../../../src/constants/user-roles.js";
import { parseWithSchema } from "../../../src/lib/validation.js";
import { createHotelSchema } from "../../../src/schemas/hotel-schemas.js";
import { createRoomSchema } from "../../../src/schemas/room-schemas.js";
import { createRoomTypeSchema } from "../../../src/schemas/room-type-schemas.js";
import { createUnitSchema } from "../../../src/schemas/unit-schemas.js";
import { registerUserSchema } from "../../../src/schemas/user-schemas.js";
import { hotelService } from "../../../src/services/hotel-service.js";
import { roomService } from "../../../src/services/room-service.js";
import { roomTypeService } from "../../../src/services/room-type-service.js";
import { unitService } from "../../../src/services/unit-service.js";
import { userService } from "../../../src/services/user-service.js";

export const TEST_PASSWORD = `Integration${randomUUID().slice(0, 8)}1`;
export const VALID_CNPJ = "11222333000181";

function calculateCpfDigit(digits) {
    const weightStart = digits.length + 1;
    const sum = digits.reduce(
        (total, digit, index) => total + digit * (weightStart - index),
        0,
    );
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
}

export function generateCpf() {
    const base = Array.from({ length: 9 }, () => randomInt(0, 10));
    if (new Set(base).size === 1) {
        base[0] = (base[0] + 1) % 10;
    }
    const firstDigit = calculateCpfDigit(base);
    const secondDigit = calculateCpfDigit([...base, firstDigit]);
    return [...base, firstDigit, secondDigit].join("");
}

export function buildAccount(overrides = {}) {
    const tag = randomUUID().slice(0, 8);
    return {
        name: `Integration User ${tag}`,
        email: `integration-${tag}@example.com`,
        cpf: generateCpf(),
        password: TEST_PASSWORD,
        role: USER_ROLES.MANAGER,
        ...overrides,
    };
}

export async function createUser(overrides = {}) {
    const { role, ...account } = buildAccount(overrides);
    const input = parseWithSchema(registerUserSchema, account);
    return userService.createUser({ ...input, role });
}

export function createManager(overrides = {}) {
    return createUser({ ...overrides, role: USER_ROLES.MANAGER });
}

export function createAdmin(overrides = {}) {
    return createUser({ ...overrides, role: USER_ROLES.ADMIN });
}

export function createDraftHotel(owner, overrides = {}) {
    const input = parseWithSchema(createHotelSchema, {
        name: "Hotel Integração",
        description: "Hotel criado pelos testes de integração.",
        category: "HOTEL",
        cnpj: VALID_CNPJ,
        email: owner.email,
        ...overrides,
    });
    return hotelService.createHotel(owner, input);
}

export function buildUnitInput(overrides = {}) {
    return parseWithSchema(createUnitSchema, {
        name: "Unidade Centro",
        email: "centro@example.com",
        checkInTime: "14:00",
        checkOutTime: "12:00",
        overbookingPercentage: 5,
        address: {
            zipCode: "01001-000",
            street: "Praça da Sé",
            number: "100",
            neighborhood: "Sé",
            city: "São Paulo",
            state: "SP",
        },
        phones: ["(11) 3333-4444"],
        ...overrides,
    });
}

export function createUnit(manager, hotelId, overrides = {}) {
    return unitService.createUnit(manager, hotelId, buildUnitInput(overrides));
}

export function createRoomType(manager, hotelId, overrides = {}) {
    const input = parseWithSchema(createRoomTypeSchema, {
        name: "Standard",
        description: "Quarto padrão.",
        maxGuests: 2,
        areaM2: "20.50",
        defaultPrice: "250.00",
        beds: [{ bedType: "DOUBLE", quantity: 1 }],
        ...overrides,
    });
    return roomTypeService.createRoomType(manager, hotelId, input);
}

export function buildRoomInput(roomTypeId, overrides = {}) {
    return parseWithSchema(createRoomSchema, {
        roomTypeId,
        number: "101",
        floor: 1,
        ...overrides,
    });
}

export function createRoom(manager, unitId, roomTypeId, overrides = {}) {
    return roomService.createRoom(
        manager,
        unitId,
        buildRoomInput(roomTypeId, overrides),
    );
}

export async function createHotelWithUnit(owner) {
    const hotel = await createDraftHotel(owner);
    const unit = await createUnit(owner, hotel.id);
    return { hotel, unit };
}
