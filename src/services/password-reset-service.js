import { PASSWORD_RESET_TOKEN_TTL_MINUTES } from "../constants/password-reset.js";
import { ERROR_CODES, RateLimitError, ValidationError } from "../lib/errors.js";
import { logger as defaultLogger, serializeError } from "../lib/logger.js";
import { transactionRunner as defaultTransactionRunner } from "../lib/transaction.js";
import { passwordHasher as defaultPasswordHasher } from "../modules/auth/password-hasher.js";
import {
    buildPasswordResetRequestedEvent,
    noopPasswordResetEventPublisher,
} from "../modules/auth/password-reset-events.js";
import {
    buildForgotPasswordKey,
    buildResetPasswordKey,
    forgotPasswordRateLimiter as defaultForgotPasswordRateLimiter,
    resetPasswordRateLimiter as defaultResetPasswordRateLimiter,
} from "../modules/auth/password-reset-rate-limit.js";
import {
    generatePasswordResetToken,
    hashPasswordResetToken,
} from "../modules/auth/password-reset-token.js";
import { passwordResetTokenRepository as defaultPasswordResetTokenRepository } from "../repositories/password-reset-token-repository.js";
import { userRepository as defaultUserRepository } from "../repositories/user-repository.js";

const MS_PER_MINUTE = 60 * 1000;

export const PASSWORD_RESET_PUBLISH_FAILURE_LOG_MESSAGE =
    "Password reset event could not be published";

function createInvalidResetTokenError() {
    return new ValidationError(
        "Link de recuperação inválido ou expirado. Solicite um novo.",
        ERROR_CODES.INVALID_RESET_TOKEN,
    );
}

function calculateExpiresAt(now) {
    return new Date(
        now.getTime() + PASSWORD_RESET_TOKEN_TTL_MINUTES * MS_PER_MINUTE,
    );
}

function isTokenUsable(token, now) {
    return Boolean(token) && token.usedAt === null && token.expiresAt > now;
}

async function assertNotLimited(rateLimiter, key, message) {
    const { isLimited, retryAfterSeconds } = await rateLimiter.check(key);
    if (isLimited) {
        throw new RateLimitError(message, retryAfterSeconds);
    }
}

export function createPasswordResetService({
    userRepository,
    passwordResetTokenRepository,
    passwordHasher,
    transactionRunner,
    eventPublisher = noopPasswordResetEventPublisher,
    forgotPasswordRateLimiter,
    resetPasswordRateLimiter,
    generateToken = generatePasswordResetToken,
    clock = () => new Date(),
    logger = defaultLogger,
}) {
    async function storeNewToken(user, now) {
        const token = generateToken();
        const expiresAt = calculateExpiresAt(now);
        await transactionRunner.run(async (client) => {
            await passwordResetTokenRepository.invalidateActiveByUser(
                { userId: user.id, usedAt: now },
                client,
            );
            await passwordResetTokenRepository.create(
                {
                    userId: user.id,
                    tokenHash: hashPasswordResetToken(token),
                    expiresAt,
                },
                client,
            );
        });
        return { token, expiresAt };
    }

    async function publishResetRequested(user, { token, expiresAt }, now) {
        try {
            await eventPublisher.publish(
                buildPasswordResetRequestedEvent({
                    userId: user.id,
                    email: user.email,
                    name: user.name,
                    token,
                    expiresAt,
                    occurredAt: now,
                }),
            );
        } catch (error) {
            logger.error(PASSWORD_RESET_PUBLISH_FAILURE_LOG_MESSAGE, {
                userId: user.id,
                error: serializeError(error),
            });
        }
    }

    async function requestReset({ email, ipAddress }) {
        const rateLimitKey = buildForgotPasswordKey({ email, ipAddress });
        await assertNotLimited(
            forgotPasswordRateLimiter,
            rateLimitKey,
            "Muitas solicitações de recuperação de senha. Tente novamente em alguns minutos.",
        );
        await forgotPasswordRateLimiter.recordFailure(rateLimitKey);
        const user = await userRepository.findByEmail(email);
        if (!user?.isActive) {
            return;
        }
        const now = clock();
        const issuedToken = await storeNewToken(user, now);
        await publishResetRequested(user, issuedToken, now);
    }

    async function findUsableTokenOwner(token, now) {
        const storedToken = await passwordResetTokenRepository.findByTokenHash(
            hashPasswordResetToken(token),
        );
        if (!isTokenUsable(storedToken, now)) {
            return null;
        }
        const user = await userRepository.findById(storedToken.userId);
        return user?.isActive ? { storedToken, user } : null;
    }

    async function replacePassword({ storedToken, user }, passwordHash, now) {
        await transactionRunner.run(async (client) => {
            const isMarked =
                await passwordResetTokenRepository.markUsedIfActive(
                    { id: storedToken.id, usedAt: now },
                    client,
                );
            if (!isMarked) {
                throw createInvalidResetTokenError();
            }
            await userRepository.update(user.id, { passwordHash }, client);
            await passwordResetTokenRepository.invalidateActiveByUser(
                { userId: user.id, usedAt: now },
                client,
            );
        });
    }

    async function resetPassword({ token, newPassword, ipAddress }) {
        const rateLimitKey = buildResetPasswordKey({ ipAddress });
        await assertNotLimited(
            resetPasswordRateLimiter,
            rateLimitKey,
            "Muitas tentativas de redefinição de senha. Tente novamente em alguns minutos.",
        );
        const now = clock();
        const owner = await findUsableTokenOwner(token, now);
        if (!owner) {
            await resetPasswordRateLimiter.recordFailure(rateLimitKey);
            throw createInvalidResetTokenError();
        }
        const passwordHash = await passwordHasher.hash(newPassword);
        await replacePassword(owner, passwordHash, now);
    }

    return Object.freeze({ requestReset, resetPassword });
}

export const passwordResetService = createPasswordResetService({
    userRepository: defaultUserRepository,
    passwordResetTokenRepository: defaultPasswordResetTokenRepository,
    passwordHasher: defaultPasswordHasher,
    transactionRunner: defaultTransactionRunner,
    forgotPasswordRateLimiter: defaultForgotPasswordRateLimiter,
    resetPasswordRateLimiter: defaultResetPasswordRateLimiter,
});
