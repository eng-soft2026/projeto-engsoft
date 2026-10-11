import { SYSTEM_ACCEPTANCE_TYPES } from "../../src/constants/acceptance-types.js";
import { DEFAULT_SYSTEM_SETTINGS } from "../../src/constants/system-settings.js";

function upsertSystemAcceptanceType(prisma, acceptanceType) {
    const data = {
        name: acceptanceType.name,
        description: acceptanceType.description,
        isSystem: true,
    };
    return prisma.acceptanceType.upsert({
        where: { code: acceptanceType.code },
        create: { code: acceptanceType.code, ...data },
        update: data,
    });
}

function createSettingIfMissing(prisma, setting) {
    return prisma.systemSetting.upsert({
        where: { key: setting.key },
        create: { ...setting },
        update: {},
    });
}

export async function seedDatabase(prisma) {
    await prisma.$transaction([
        ...SYSTEM_ACCEPTANCE_TYPES.map((acceptanceType) =>
            upsertSystemAcceptanceType(prisma, acceptanceType),
        ),
        ...DEFAULT_SYSTEM_SETTINGS.map((setting) =>
            createSettingIfMissing(prisma, setting),
        ),
    ]);
}
