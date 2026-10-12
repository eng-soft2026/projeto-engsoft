import { passwordHasher as defaultPasswordHasher } from "../modules/auth/password-hasher.js";
import { userRepository as defaultUserRepository } from "../repositories/user-repository.js";

function toSessionUser({ id, name, email, role }) {
    return { id, name, email, role };
}

export function createAuthService({ userRepository, passwordHasher }) {
    async function verifyCredentials({ email, password }) {
        const user = await userRepository.findCredentialsByEmail(email);
        if (!user) {
            await passwordHasher.verifyAgainstDummyHash(password);
            return null;
        }

        const isPasswordValid = await passwordHasher.verify(
            password,
            user.passwordHash,
        );
        if (!isPasswordValid || !user.isActive) {
            return null;
        }

        return toSessionUser(user);
    }

    async function findActiveUser(userId) {
        const user = await userRepository.findById(userId);
        return user?.isActive ? user : null;
    }

    return Object.freeze({ verifyCredentials, findActiveUser });
}

export const authService = createAuthService({
    userRepository: defaultUserRepository,
    passwordHasher: defaultPasswordHasher,
});
