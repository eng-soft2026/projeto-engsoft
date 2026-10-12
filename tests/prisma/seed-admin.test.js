import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    ADMIN_SEED_RESULTS,
    readAdminSeedInput,
    seedAdmin,
} from "../../prisma/seeds/seed-admin.js";

const ADMIN_ENV = Object.freeze({
    ADMIN_NAME: "Admin Global",
    ADMIN_EMAIL: "ADMIN@example.com",
    ADMIN_CPF: "111.444.777-35",
    ADMIN_PASSWORD: "senhaAdmin1",
});

const ADMIN_INPUT = Object.freeze({
    name: "Admin Global",
    email: "ADMIN@example.com",
    cpf: "111.444.777-35",
    password: "senhaAdmin1",
});

describe("readAdminSeedInput", () => {
    it("returns null when no ADMIN_* variable is set", () => {
        expect(readAdminSeedInput({})).toBeNull();
        expect(
            readAdminSeedInput({
                ADMIN_NAME: "",
                ADMIN_EMAIL: "",
                ADMIN_CPF: "",
                ADMIN_PASSWORD: "",
            }),
        ).toBeNull();
    });

    it("maps the variables to the account fields", () => {
        expect(readAdminSeedInput(ADMIN_ENV)).toEqual(ADMIN_INPUT);
    });

    it("fails when only some variables are set", () => {
        expect(() =>
            readAdminSeedInput({ ADMIN_EMAIL: "admin@example.com" }),
        ).toThrow("ADMIN_NAME, ADMIN_EMAIL, ADMIN_CPF, ADMIN_PASSWORD");
    });
});

describe("seedAdmin", () => {
    let userRepository;
    let userService;

    beforeEach(() => {
        userRepository = {
            findByEmail: vi.fn(async () => null),
            findByCpf: vi.fn(async () => null),
        };
        userService = { createUser: vi.fn(async () => ({ id: "admin-1" })) };
    });

    it("skips when there is no admin input", async () => {
        await expect(
            seedAdmin({ adminInput: null, userRepository, userService }),
        ).resolves.toBe(ADMIN_SEED_RESULTS.SKIPPED);
        expect(userService.createUser).not.toHaveBeenCalled();
    });

    it("creates the admin with normalized data and the ADMIN role", async () => {
        await expect(
            seedAdmin({ adminInput: ADMIN_INPUT, userRepository, userService }),
        ).resolves.toBe(ADMIN_SEED_RESULTS.CREATED);
        expect(userService.createUser).toHaveBeenCalledWith({
            name: "Admin Global",
            email: "admin@example.com",
            cpf: "11144477735",
            password: "senhaAdmin1",
            role: "ADMIN",
        });
    });

    it("does not touch an existing admin, so re-seeding is idempotent", async () => {
        userRepository.findByEmail.mockResolvedValueOnce({
            id: "admin-1",
            role: "ADMIN",
        });

        await expect(
            seedAdmin({ adminInput: ADMIN_INPUT, userRepository, userService }),
        ).resolves.toBe(ADMIN_SEED_RESULTS.ALREADY_EXISTS);
        expect(userService.createUser).not.toHaveBeenCalled();
    });

    it("fails when the e-mail belongs to a non-admin user", async () => {
        userRepository.findByEmail.mockResolvedValueOnce({
            id: "user-1",
            role: "CUSTOMER",
        });

        await expect(
            seedAdmin({ adminInput: ADMIN_INPUT, userRepository, userService }),
        ).rejects.toThrow("without the ADMIN role");
    });

    it("fails when the CPF belongs to another user", async () => {
        userRepository.findByCpf.mockResolvedValueOnce({ id: "user-1" });

        await expect(
            seedAdmin({ adminInput: ADMIN_INPUT, userRepository, userService }),
        ).rejects.toThrow("ADMIN_CPF already belongs to another user.");
    });

    it("fails with the validation message and never echoes the password", async () => {
        const seed = seedAdmin({
            adminInput: { ...ADMIN_INPUT, password: "fraca" },
            userRepository,
            userService,
        });

        await expect(seed).rejects.toThrow(
            "Invalid admin seed data: A senha deve ter pelo menos 8 caracteres.",
        );
        await expect(seed).rejects.not.toThrow("fraca");
    });

    it("fails for an invalid CPF", async () => {
        await expect(
            seedAdmin({
                adminInput: { ...ADMIN_INPUT, cpf: "111.444.777-36" },
                userRepository,
                userService,
            }),
        ).rejects.toThrow("Invalid admin seed data: CPF inválido.");
    });
});
