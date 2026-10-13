import { getPrisma } from "../lib/prisma.js";

const SETTING_VALUE_FIELDS = Object.freeze({
    key: true,
    value: true,
    valueType: true,
});

export function createSystemSettingRepository(getClient = getPrisma) {
    return Object.freeze({
        findByKey(key, client = getClient()) {
            return client.systemSetting.findUnique({
                where: { key },
                select: SETTING_VALUE_FIELDS,
            });
        },
    });
}

export const systemSettingRepository = createSystemSettingRepository();
