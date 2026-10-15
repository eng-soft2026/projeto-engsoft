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
import {
    buildHotel,
    buildRoom,
    buildRoomType,
    buildUnit,
    buildUser,
} from "../../helpers/factories/index.js";

export {
    TEST_PASSWORD,
    VALID_CNPJ,
    generateCpf,
} from "../../helpers/factories/index.js";

export function buildAccount(overrides = {}) {
    return buildUser({ role: USER_ROLES.MANAGER, ...overrides });
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
    const input = parseWithSchema(
        createHotelSchema,
        buildHotel({ email: owner.email, ...overrides }),
    );
    return hotelService.createHotel(owner, input);
}

export function buildUnitInput(overrides = {}) {
    return parseWithSchema(createUnitSchema, buildUnit(overrides));
}

export function createUnit(manager, hotelId, overrides = {}) {
    return unitService.createUnit(manager, hotelId, buildUnitInput(overrides));
}

export function createRoomType(manager, hotelId, overrides = {}) {
    const input = parseWithSchema(
        createRoomTypeSchema,
        buildRoomType(overrides),
    );
    return roomTypeService.createRoomType(manager, hotelId, input);
}

export function buildRoomInput(roomTypeId, overrides = {}) {
    return parseWithSchema(
        createRoomSchema,
        buildRoom({ roomTypeId, ...overrides }),
    );
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
