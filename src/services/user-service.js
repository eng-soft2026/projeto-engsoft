import {
    ConflictError,
    ERROR_CODES,
    NotFoundError,
    UnauthorizedError,
} from "../lib/errors.js";
import { isUniqueConstraintViolation } from "../lib/prisma-errors.js";
import { passwordHasher as defaultPasswordHasher } from "../modules/auth/password-hasher.js";
import { userRepository as defaultUserRepository } from "../repositories/user-repository.js";

function createUserAlreadyExistsError() {
    return new ConflictError(
        ERROR_CODES.USER_ALREADY_EXISTS,
        "Já existe uma conta com este e-mail ou CPF.",
    );
}

function createUserNotFoundError() {
    return new NotFoundError(
        ERROR_CODES.USER_NOT_FOUND,
        "Usuário não encontrado.",
    );
}

function createWrongCurrentPasswordError() {
    return new UnauthorizedError(
        "Senha atual incorreta.",
        ERROR_CODES.INVALID_CREDENTIALS,
    );
}

async function persistUniqueUser(persist) {
    try {
        return await persist();
    } catch (error) {
        if (isUniqueConstraintViolation(error)) {
            throw createUserAlreadyExistsError();
        }
        throw error;
    }
}

export function createUserService({ userRepository, passwordHasher }) {
    async function assertEmailAvailable(email) {
        const owner = await userRepository.findByEmail(email);
        if (owner) {
            throw createUserAlreadyExistsError();
        }
    }

    async function assertCurrentPassword(currentPassword, passwordHash) {
        const isCurrentPasswordValid = await passwordHasher.verify(
            currentPassword,
            passwordHash,
        );
        if (!isCurrentPasswordValid) {
            throw createWrongCurrentPasswordError();
        }
    }

    async function findCredentialsOrThrow(userId) {
        const user = await userRepository.findCredentialsById(userId);
        if (!user) {
            throw createUserNotFoundError();
        }
        return user;
    }

    async function buildPasswordChange(user, newPassword, currentPassword) {
        if (newPassword === undefined) {
            return {};
        }
        await assertCurrentPassword(currentPassword, user.passwordHash);
        return { passwordHash: await passwordHasher.hash(newPassword) };
    }

    async function buildEmailChange(user, email) {
        if (email === undefined || email === user.email) {
            return {};
        }
        await assertEmailAvailable(email);
        return { email };
    }

    async function createUser({ name, email, cpf, password, role }) {
        const isTaken = await userRepository.existsByEmailOrCpf({
            email,
            cpf,
        });
        if (isTaken) {
            throw createUserAlreadyExistsError();
        }

        const passwordHash = await passwordHasher.hash(password);
        return persistUniqueUser(() =>
            userRepository.create({ name, email, cpf, role, passwordHash }),
        );
    }

    async function getProfile(userId) {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw createUserNotFoundError();
        }
        return user;
    }

    async function getProfileByEmail(email) {
        const user = await userRepository.findByEmail(email);
        if (!user) {
            throw createUserNotFoundError();
        }
        return user;
    }

    async function updateProfile(
        userId,
        { name, email, newPassword, currentPassword },
    ) {
        const user = await findCredentialsOrThrow(userId);
        const passwordChange = await buildPasswordChange(
            user,
            newPassword,
            currentPassword,
        );
        const emailChange = await buildEmailChange(user, email);
        const nameChange = name === undefined ? {} : { name };

        return persistUniqueUser(() =>
            userRepository.update(userId, {
                ...nameChange,
                ...emailChange,
                ...passwordChange,
            }),
        );
    }

    return Object.freeze({
        createUser,
        getProfile,
        getProfileByEmail,
        updateProfile,
    });
}

export const userService = createUserService({
    userRepository: defaultUserRepository,
    passwordHasher: defaultPasswordHasher,
});
