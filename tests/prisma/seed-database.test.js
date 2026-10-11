import { beforeEach, describe, expect, it, vi } from "vitest";
import { SYSTEM_ACCEPTANCE_TYPES } from "../../src/constants/acceptance-types.js";
import { DEFAULT_SYSTEM_SETTINGS } from "../../src/constants/system-settings.js";
import { seedDatabase } from "../../prisma/seeds/seed-database.js";

function createFakePrisma() {
    return {
        acceptanceType: {
            upsert: vi.fn((args) => ({ model: "acceptanceType", args })),
        },
        systemSetting: {
            upsert: vi.fn((args) => ({ model: "systemSetting", args })),
        },
        $transaction: vi.fn(async (operations) => operations),
    };
}

describe("seedDatabase", () => {
    let prisma;

    beforeEach(() => {
        prisma = createFakePrisma();
    });

    it("runs every upsert in a single transaction", async () => {
        await seedDatabase(prisma);

        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        const [operations] = prisma.$transaction.mock.calls[0];
        expect(operations).toHaveLength(
            SYSTEM_ACCEPTANCE_TYPES.length + DEFAULT_SYSTEM_SETTINGS.length,
        );
    });

    it("upserts every acceptance type by code as a system type", async () => {
        await seedDatabase(prisma);

        expect(prisma.acceptanceType.upsert).toHaveBeenCalledTimes(6);
        for (const { code, name, description } of SYSTEM_ACCEPTANCE_TYPES) {
            expect(prisma.acceptanceType.upsert).toHaveBeenCalledWith({
                where: { code },
                create: { code, name, description, isSystem: true },
                update: { name, description, isSystem: true },
            });
        }
    });

    it("creates missing settings without overwriting existing values", async () => {
        await seedDatabase(prisma);

        expect(prisma.systemSetting.upsert).toHaveBeenCalledTimes(7);
        for (const setting of DEFAULT_SYSTEM_SETTINGS) {
            expect(prisma.systemSetting.upsert).toHaveBeenCalledWith({
                where: { key: setting.key },
                create: { ...setting },
                update: {},
            });
        }
    });
});
