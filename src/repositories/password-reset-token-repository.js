import { getPrisma } from "../lib/prisma.js";

const TOKEN_FIELDS = Object.freeze({
    id: true,
    userId: true,
    expiresAt: true,
    usedAt: true,
    createdAt: true,
});

export function createPasswordResetTokenRepository(getClient = getPrisma) {
    return Object.freeze({
        create(data, client = getClient()) {
            return client.passwordResetToken.create({
                data,
                select: TOKEN_FIELDS,
            });
        },

        findByTokenHash(tokenHash, client = getClient()) {
            return client.passwordResetToken.findUnique({
                where: { tokenHash },
                select: TOKEN_FIELDS,
            });
        },

        async markUsedIfActive({ id, usedAt }, client = getClient()) {
            const { count } = await client.passwordResetToken.updateMany({
                where: { id, usedAt: null, expiresAt: { gt: usedAt } },
                data: { usedAt },
            });
            return count === 1;
        },

        async invalidateActiveByUser({ userId, usedAt }, client = getClient()) {
            const { count } = await client.passwordResetToken.updateMany({
                where: { userId, usedAt: null },
                data: { usedAt },
            });
            return count;
        },
    });
}

export const passwordResetTokenRepository =
    createPasswordResetTokenRepository();
