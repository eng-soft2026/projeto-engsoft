import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    ConflictError,
    NotFoundError,
    UnauthorizedError,
} from "../../src/lib/errors.js";
import { createUserService } from "../../src/services/user-service.js";

const PUBLIC_USER = Object.freeze({
    id: "user-1",
    name: "Ana Souza",
    email: "ana@example.com",
    cpf: "52998224725",
    role: "CUSTOMER",
    isActive: true,
});

const STORED_USER = Object.freeze({
    ...PUBLIC_USER,
    passwordHash: "hashed:senhaSegura1",
});

const NEW_USER = Object.freeze({
    name: "Ana Souza",
    email: "ana@example.com",
    cpf: "52998224725",
    password: "senhaSegura1",
    role: "CUSTOMER",
});

function withoutPasswordHash(user) {
    const publicUser = { ...user };
    delete publicUser.passwordHash;
    return publicUser;
}

function createFakeUserRepository() {
    return {
        findById: vi.fn(async () => PUBLIC_USER),
        findByEmail: vi.fn(async () => null),
        findByCpf: vi.fn(async () => null),
        findCredentialsById: vi.fn(async () => STORED_USER),
        findCredentialsByEmail: vi.fn(async () => STORED_USER),
        existsByEmailOrCpf: vi.fn(async () => false),
        create: vi.fn(async (data) =>
            withoutPasswordHash({ id: "user-1", isActive: true, ...data }),
        ),
        update: vi.fn(async (id, data) =>
            withoutPasswordHash({ ...PUBLIC_USER, ...data }),
        ),
    };
}

function createFakePasswordHasher() {
    return {
        hash: vi.fn(async (password) => `hashed:${password}`),
        verify: vi.fn(
            async (password, passwordHash) =>
                passwordHash === `hashed:${password}`,
        ),
        verifyAgainstDummyHash: vi.fn(async () => false),
    };
}

function createUniqueConstraintError() {
    return Object.assign(new Error("Unique constraint failed"), {
        code: "P2002",
    });
}

describe("userService", () => {
    let userRepository;
    let passwordHasher;
    let userService;

    beforeEach(() => {
        userRepository = createFakeUserRepository();
        passwordHasher = createFakePasswordHasher();
        userService = createUserService({ userRepository, passwordHasher });
    });

    describe("createUser", () => {
        it("stores the password hash, never the plain password", async () => {
            await userService.createUser(NEW_USER);

            expect(userRepository.create).toHaveBeenCalledWith({
                name: "Ana Souza",
                email: "ana@example.com",
                cpf: "52998224725",
                role: "CUSTOMER",
                passwordHash: "hashed:senhaSegura1",
            });
        });

        it("returns the user without the password hash", async () => {
            const user = await userService.createUser(NEW_USER);

            expect(user).not.toHaveProperty("passwordHash");
            expect(user).not.toHaveProperty("password");
            expect(user).toMatchObject({ id: "user-1", role: "CUSTOMER" });
        });

        it("keeps the given role", async () => {
            await userService.createUser({ ...NEW_USER, role: "MANAGER" });

            expect(userRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({ role: "MANAGER" }),
            );
        });

        it("rejects a taken e-mail or CPF without hashing", async () => {
            userRepository.existsByEmailOrCpf.mockResolvedValueOnce(true);

            await expect(
                userService.createUser(NEW_USER),
            ).rejects.toMatchObject({ code: "USER_ALREADY_EXISTS" });
            expect(passwordHasher.hash).not.toHaveBeenCalled();
            expect(userRepository.create).not.toHaveBeenCalled();
        });

        it("turns a concurrent unique violation into USER_ALREADY_EXISTS", async () => {
            userRepository.create.mockRejectedValueOnce(
                createUniqueConstraintError(),
            );

            await expect(userService.createUser(NEW_USER)).rejects.toThrow(
                ConflictError,
            );
        });

        it("rethrows other persistence errors", async () => {
            userRepository.create.mockRejectedValueOnce(new Error("db down"));

            await expect(userService.createUser(NEW_USER)).rejects.toThrow(
                "db down",
            );
        });
    });

    describe("getProfile", () => {
        it("returns the public user", async () => {
            await expect(userService.getProfile("user-1")).resolves.toEqual(
                PUBLIC_USER,
            );
        });

        it("throws USER_NOT_FOUND for an unknown user", async () => {
            userRepository.findById.mockResolvedValueOnce(null);

            await expect(userService.getProfile("missing")).rejects.toThrow(
                NotFoundError,
            );
        });
    });

    describe("getProfileByEmail", () => {
        it("returns the public user", async () => {
            userRepository.findByEmail.mockResolvedValueOnce(PUBLIC_USER);

            await expect(
                userService.getProfileByEmail("ana@example.com"),
            ).resolves.toEqual(PUBLIC_USER);
        });

        it("throws USER_NOT_FOUND for an unknown e-mail", async () => {
            await expect(
                userService.getProfileByEmail("x@example.com"),
            ).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
        });
    });

    describe("updateProfile", () => {
        it("updates the name", async () => {
            const user = await userService.updateProfile("user-1", {
                name: "Bia",
            });

            expect(userRepository.update).toHaveBeenCalledWith("user-1", {
                name: "Bia",
            });
            expect(user.name).toBe("Bia");
        });

        it("updates the e-mail when it is free", async () => {
            await userService.updateProfile("user-1", {
                email: "bia@example.com",
            });

            expect(userRepository.update).toHaveBeenCalledWith("user-1", {
                email: "bia@example.com",
            });
        });

        it("skips the availability check when the e-mail did not change", async () => {
            await userService.updateProfile("user-1", {
                email: "ana@example.com",
            });

            expect(userRepository.findByEmail).not.toHaveBeenCalled();
            expect(userRepository.update).toHaveBeenCalledWith("user-1", {});
        });

        it("rejects an e-mail used by another account", async () => {
            userRepository.findByEmail.mockResolvedValueOnce({
                ...PUBLIC_USER,
                id: "user-2",
            });

            await expect(
                userService.updateProfile("user-1", {
                    email: "bia@example.com",
                }),
            ).rejects.toMatchObject({ code: "USER_ALREADY_EXISTS" });
            expect(userRepository.update).not.toHaveBeenCalled();
        });

        it("changes the password when the current one is right", async () => {
            await userService.updateProfile("user-1", {
                newPassword: "novaSenha1",
                currentPassword: "senhaSegura1",
            });

            expect(userRepository.update).toHaveBeenCalledWith("user-1", {
                passwordHash: "hashed:novaSenha1",
            });
        });

        it("rejects a wrong current password with INVALID_CREDENTIALS", async () => {
            const update = userService.updateProfile("user-1", {
                newPassword: "novaSenha1",
                currentPassword: "errada123",
            });

            await expect(update).rejects.toThrow(UnauthorizedError);
            await expect(update).rejects.toMatchObject({
                code: "INVALID_CREDENTIALS",
            });
            expect(userRepository.update).not.toHaveBeenCalled();
        });

        it("checks the current password before the e-mail availability", async () => {
            await expect(
                userService.updateProfile("user-1", {
                    email: "bia@example.com",
                    newPassword: "novaSenha1",
                    currentPassword: "errada123",
                }),
            ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
            expect(userRepository.findByEmail).not.toHaveBeenCalled();
        });

        it("never returns the password hash", async () => {
            const user = await userService.updateProfile("user-1", {
                newPassword: "novaSenha1",
                currentPassword: "senhaSegura1",
            });

            expect(user).not.toHaveProperty("passwordHash");
        });

        it("throws USER_NOT_FOUND for an unknown user", async () => {
            userRepository.findCredentialsById.mockResolvedValueOnce(null);

            await expect(
                userService.updateProfile("missing", { name: "Bia" }),
            ).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
        });

        it("turns a concurrent unique violation into USER_ALREADY_EXISTS", async () => {
            userRepository.update.mockRejectedValueOnce(
                createUniqueConstraintError(),
            );

            await expect(
                userService.updateProfile("user-1", {
                    email: "bia@example.com",
                }),
            ).rejects.toMatchObject({ code: "USER_ALREADY_EXISTS" });
        });
    });
});
