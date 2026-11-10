export const PASSWORD_RESET_EVENT_TYPES = Object.freeze({
    REQUESTED: "PASSWORD_RESET_REQUESTED",
});

export function buildPasswordResetRequestedEvent({
    userId,
    email,
    name,
    token,
    expiresAt,
    occurredAt,
}) {
    return Object.freeze({
        type: PASSWORD_RESET_EVENT_TYPES.REQUESTED,
        userId,
        email,
        name,
        token,
        expiresAt,
        occurredAt,
    });
}

export const noopPasswordResetEventPublisher = Object.freeze({
    async publish() {},
});
