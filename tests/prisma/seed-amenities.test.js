import { describe, expect, it, vi } from "vitest";
import { GLOBAL_AMENITY_NAMES } from "../../src/constants/global-amenities.js";
import { buildGlobalAmenityOperations } from "../../prisma/seeds/seed-amenities.js";

const MAX_AMENITY_NAME_LENGTH = 100;

function createFakePrisma(existingNames = []) {
    return {
        amenity: {
            findMany: vi.fn(async () =>
                existingNames.map((name) => ({ name })),
            ),
            create: vi.fn((args) => ({ model: "amenity", args })),
        },
    };
}

function readCreatedNames(prisma) {
    return prisma.amenity.create.mock.calls.map(([args]) => args.data.name);
}

describe("GLOBAL_AMENITY_NAMES", () => {
    it("has unique names ignoring case", () => {
        const normalized = GLOBAL_AMENITY_NAMES.map((name) =>
            name.toLocaleLowerCase("pt-BR"),
        );

        expect(new Set(normalized).size).toBe(GLOBAL_AMENITY_NAMES.length);
    });

    it("fits the amenity name column", () => {
        for (const name of GLOBAL_AMENITY_NAMES) {
            expect(name.trim()).toBe(name);
            expect(name.length).toBeGreaterThan(0);
            expect(name.length).toBeLessThanOrEqual(MAX_AMENITY_NAME_LENGTH);
        }
    });

    it("covers the catalog required by the issue", () => {
        expect(GLOBAL_AMENITY_NAMES).toEqual(
            expect.arrayContaining([
                "Wi-Fi",
                "Estacionamento",
                "Piscina",
                "Café da manhã",
                "Ar-condicionado",
                "TV",
                "Rampa de acesso",
                "Banheiro adaptado",
                "Aceita pets",
            ]),
        );
    });
});

describe("buildGlobalAmenityOperations", () => {
    it("looks up only the seeded global amenities", async () => {
        const prisma = createFakePrisma();

        await buildGlobalAmenityOperations(prisma);

        expect(prisma.amenity.findMany).toHaveBeenCalledWith({
            where: {
                isGlobal: true,
                createdByUserId: null,
                name: { in: [...GLOBAL_AMENITY_NAMES] },
            },
            select: { name: true },
        });
    });

    it("creates every global amenity on an empty database", async () => {
        const prisma = createFakePrisma();

        const operations = await buildGlobalAmenityOperations(prisma);

        expect(operations).toHaveLength(GLOBAL_AMENITY_NAMES.length);
        expect(readCreatedNames(prisma)).toEqual([...GLOBAL_AMENITY_NAMES]);
        for (const [args] of prisma.amenity.create.mock.calls) {
            expect(args.data).toEqual({
                name: expect.any(String),
                isGlobal: true,
                createdByUserId: null,
            });
        }
    });

    it("creates nothing when the catalog already exists", async () => {
        const prisma = createFakePrisma([...GLOBAL_AMENITY_NAMES]);

        const operations = await buildGlobalAmenityOperations(prisma);

        expect(operations).toEqual([]);
        expect(prisma.amenity.create).not.toHaveBeenCalled();
    });

    it("creates only the missing amenities and ignores case", async () => {
        const prisma = createFakePrisma(["WI-FI", "piscina"]);

        const operations = await buildGlobalAmenityOperations(prisma);

        expect(operations).toHaveLength(GLOBAL_AMENITY_NAMES.length - 2);
        expect(readCreatedNames(prisma)).not.toContain("Wi-Fi");
        expect(readCreatedNames(prisma)).not.toContain("Piscina");
        expect(readCreatedNames(prisma)).toContain("Estacionamento");
    });
});
