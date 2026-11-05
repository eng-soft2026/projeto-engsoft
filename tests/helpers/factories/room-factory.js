import { randomUUID } from "node:crypto";

export function buildRoom(overrides = {}) {
    return {
        roomTypeId: randomUUID(),
        number: "101",
        floor: 1,
        ...overrides,
    };
}
