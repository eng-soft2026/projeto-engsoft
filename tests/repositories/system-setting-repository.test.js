import { describe, expect, it, vi } from "vitest";
import { createSystemSettingRepository } from "../../src/repositories/system-setting-repository.js";

describe("systemSettingRepository", () => {
    it("findByKey reads the value and its type by unique key", async () => {
        const prisma = {
            systemSetting: {
                findUnique: vi.fn(async () => ({ value: "10" })),
            },
        };
        const repository = createSystemSettingRepository(() => prisma);

        const setting = await repository.findByKey("MAX_OVERBOOKING_PERCENT");

        expect(setting).toEqual({ value: "10" });
        expect(prisma.systemSetting.findUnique).toHaveBeenCalledWith({
            where: { key: "MAX_OVERBOOKING_PERCENT" },
            select: { key: true, value: true, valueType: true },
        });
    });
});
