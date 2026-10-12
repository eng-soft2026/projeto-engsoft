import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAuthService } from "../../src/services/auth-service.js";

const STORED_USER = Object.freeze({
    id: "user-1",
    name: "Ana Souza",
    email: "ana@example.com",
    cpf: "52998224725",
    role: "MANAGER",
    isActive: true,
    passwordHash: "hashed:senhaSegura1",
});

const CREDENTIALS = Object.freeze({
    email: "ana@example.com",
    password: "senhaSegura1",
});

function createFakePasswordHasher() {
    return {
        hash: vi.fn(),
        verify: vi.fn(
            async (password, passwordHash) =>
                passwordHash === `hashed:${password}`,
        ),
        verifyAgainstDummyHash: vi.fn(async () => false),
    };
}

describe("authService", () => {
    let userRepository;
    let passwordHasher;
    let authService;

    beforeEach(() => {
        userRepository = {
            findCredentialsByEmail: vi.fn(async () => STORED_USER),
            findById: vi.fn(async () => STORED_USER),
        };
        passwordHasher = createFakePasswordHasher();
        authService = createAuthService({ userRepository, passwordHasher });
    });

    describe("verifyCredentials", () => {
        it("returns the session user for valid credentials", async () => {
            await expect(
                authService.verifyCredentials(CREDENTIALS),
            ).resolves.toEqual({
                id: "user-1",
                name: "Ana Souza",
                email: "ana@example.com",
                role: "MANAGER",
            });
        });

        it("never exposes the password hash or the CPF", async () => {
            const user = await authService.verifyCredentials(CREDENTIALS);

            expect(user).not.toHaveProperty("passwordHash");
            expect(user).not.toHaveProperty("cpf");
        });

        it("returns null for a wrong password", async () => {
            await expect(
                authService.verifyCredentials({
                    ...CREDENTIALS,
                    password: "errada123",
                }),
            ).resolves.toBeNull();
        });

        it("returns null for an unknown e-mail after a dummy comparison", async () => {
            userRepository.findCredentialsByEmail.mockResolvedValueOnce(null);

            await expect(
                authService.verifyCredentials(CREDENTIALS),
            ).resolves.toBeNull();
            expect(passwordHasher.verifyAgainstDummyHash).toHaveBeenCalledWith(
                "senhaSegura1",
            );
        });

        it("returns null for an inactive user even with the right password", async () => {
            userRepository.findCredentialsByEmail.mockResolvedValueOnce({
                ...STORED_USER,
                isActive: false,
            });

            await expect(
                authService.verifyCredentials(CREDENTIALS),
            ).resolves.toBeNull();
            expect(passwordHasher.verify).toHaveBeenCalled();
        });
    });

    describe("findActiveUser", () => {
        it("returns an active user", async () => {
            await expect(authService.findActiveUser("user-1")).resolves.toBe(
                STORED_USER,
            );
        });

        it("returns null for an inactive user", async () => {
            userRepository.findById.mockResolvedValueOnce({
                ...STORED_USER,
                isActive: false,
            });

            await expect(
                authService.findActiveUser("user-1"),
            ).resolves.toBeNull();
        });

        it("returns null for an unknown user", async () => {
            userRepository.findById.mockResolvedValueOnce(null);

            await expect(
                authService.findActiveUser("missing"),
            ).resolves.toBeNull();
        });
    });
});
