import { describe, expect, it } from "vitest";
import { USER_ROLES } from "../../src/constants/user-roles.js";
import { createHotelSchema } from "../../src/schemas/hotel-schemas.js";
import { createRoomSchema } from "../../src/schemas/room-schemas.js";
import { createRoomTypeSchema } from "../../src/schemas/room-type-schemas.js";
import { createUnitSchema } from "../../src/schemas/unit-schemas.js";
import {
    registerUserSchema,
    userAccountSchema,
} from "../../src/schemas/user-schemas.js";
import { isValidCpf } from "../../src/utils/cpf.js";
import {
    buildHotel,
    buildRoom,
    buildRoomType,
    buildUnit,
    buildUser,
    generateCpf,
} from "../helpers/factories/index.js";

function expectValid(schema, value) {
    const result = schema.safeParse(value);
    expect(result.error?.issues).toBeUndefined();
    expect(result.success).toBe(true);
    return result.data;
}

const FACTORIES = [
    { name: "buildUser", build: buildUser, schema: registerUserSchema },
    { name: "buildHotel", build: buildHotel, schema: createHotelSchema },
    { name: "buildUnit", build: buildUnit, schema: createUnitSchema },
    {
        name: "buildRoomType",
        build: buildRoomType,
        schema: createRoomTypeSchema,
    },
    { name: "buildRoom", build: buildRoom, schema: createRoomSchema },
];

describe.each(FACTORIES)("$name", ({ build, schema }) => {
    it("builds a value accepted by its Zod schema", () => {
        expectValid(schema, build());
    });

    it("returns a new object on every call", () => {
        expect(build()).not.toBe(build());
    });
});

describe("buildUser", () => {
    it("generates a unique e-mail and CPF on every call", () => {
        const first = buildUser();
        const second = buildUser();

        expect(first.email).not.toBe(second.email);
        expect(first.cpf).not.toBe(second.cpf);
    });

    it("applies the overrides and stays valid", () => {
        const data = expectValid(
            registerUserSchema,
            buildUser({ name: "Maria Silva", role: USER_ROLES.MANAGER }),
        );

        expect(data).toMatchObject({
            name: "Maria Silva",
            role: USER_ROLES.MANAGER,
        });
    });

    it("keeps the account valid for an ADMIN, which only the seed creates", () => {
        const { role, ...account } = buildUser({ role: USER_ROLES.ADMIN });

        expect(role).toBe(USER_ROLES.ADMIN);
        expectValid(userAccountSchema, account);
    });
});

describe("generateCpf", () => {
    it("generates CPFs with valid check digits", () => {
        const cpfs = Array.from({ length: 50 }, generateCpf);

        expect(cpfs.every(isValidCpf)).toBe(true);
    });
});

describe("buildHotel", () => {
    it("applies the overrides and stays valid", () => {
        const data = expectValid(
            createHotelSchema,
            buildHotel({ name: "Hotel Mar Azul", category: "POUSADA" }),
        );

        expect(data).toMatchObject({
            name: "Hotel Mar Azul",
            category: "POUSADA",
        });
    });
});

describe("buildUnit", () => {
    it("merges a partial address override with the default address", () => {
        const data = expectValid(
            createUnitSchema,
            buildUnit({ address: { city: "Santos" } }),
        );

        expect(data.address).toMatchObject({
            city: "Santos",
            state: "SP",
            street: "Praça da Sé",
        });
    });

    it("applies the top-level overrides and stays valid", () => {
        const data = expectValid(
            createUnitSchema,
            buildUnit({ overbookingPercentage: 0, checkInTime: "15:00" }),
        );

        expect(data).toMatchObject({
            overbookingPercentage: 0,
            checkInTime: "15:00",
        });
    });
});

describe("buildRoomType", () => {
    it("applies the overrides and stays valid", () => {
        const data = expectValid(
            createRoomTypeSchema,
            buildRoomType({ name: "Suíte", defaultPrice: "480.90" }),
        );

        expect(data).toMatchObject({ name: "Suíte", defaultPrice: "480.90" });
    });
});

describe("buildRoom", () => {
    it("applies the overrides and stays valid", () => {
        const roomTypeId = "a1b2c3d4-8b7d-4c6a-9e21-3f1c2a4e0003";
        const data = expectValid(
            createRoomSchema,
            buildRoom({ roomTypeId, number: "202", floor: 2 }),
        );

        expect(data).toMatchObject({ roomTypeId, number: "202", floor: 2 });
    });
});
