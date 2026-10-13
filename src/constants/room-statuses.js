import { RoomStatus } from "../generated/prisma/enums.ts";

export const ROOM_STATUSES = Object.freeze({ ...RoomStatus });

export const MANUAL_ROOM_STATUSES = Object.freeze([
    ROOM_STATUSES.AVAILABLE,
    ROOM_STATUSES.UNAVAILABLE,
    ROOM_STATUSES.MAINTENANCE,
]);
