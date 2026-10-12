import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    PUBLIC_USER_FIELDS,
    createUserRepository,
} from "../../src/repositories/user-repository.js";

function createFakePrisma() {
    return {
        user: {
            findUnique: vi.fn(async () => null),
            findFirst: vi.fn(async () => null),
            create: vi.fn(async () => ({ id: "user-1" })),
            update: vi.fn(async () => ({ id: "user-1" })),
        },
    };
}

describe("userRepository", () => {
    let prisma;
    let repository;

    beforeEach(() => {
        prisma = createFakePrisma();
        repository = createUserRepository(() => prisma);
    });

    it("never selects the password hash in public fields", () => {
        expect(PUBLIC_USER_FIELDS).not.toHaveProperty("passwordHash");
    });

    it.each([
        ["findById", "user-1", { id: "user-1" }],
        ["findByEmail", "ana@example.com", { email: "ana@example.com" }],
        ["findByCpf", "52998224725", { cpf: "52998224725" }],
    ])("%s selects only public fields", async (method, value, where) => {
        await repository[method](value);

        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where,
            select: PUBLIC_USER_FIELDS,
        });
    });

    it.each([
        ["findCredentialsByEmail", "ana@example.com"],
        ["findCredentialsById", "user-1"],
    ])("%s selects the password hash", async (method, value) => {
        await repository[method](value);

        const [{ select }] = prisma.user.findUnique.mock.calls[0];
        expect(select.passwordHash).toBe(true);
    });

    it("create and update return only public fields", async () => {
        await repository.create({ name: "Ana" });
        await repository.update("user-1", { name: "Bia" });

        expect(prisma.user.create).toHaveBeenCalledWith({
            data: { name: "Ana" },
            select: PUBLIC_USER_FIELDS,
        });
        expect(prisma.user.update).toHaveBeenCalledWith({
            where: { id: "user-1" },
            data: { name: "Bia" },
            select: PUBLIC_USER_FIELDS,
        });
    });

    it("existsByEmailOrCpf searches by e-mail or CPF", async () => {
        prisma.user.findFirst.mockResolvedValueOnce({ id: "user-1" });

        const exists = await repository.existsByEmailOrCpf({
            email: "ana@example.com",
            cpf: "52998224725",
        });

        expect(exists).toBe(true);
        expect(prisma.user.findFirst).toHaveBeenCalledWith({
            where: {
                OR: [{ email: "ana@example.com" }, { cpf: "52998224725" }],
            },
            select: { id: true },
        });
    });

    it("existsByEmailOrCpf returns false when nobody matches", async () => {
        await expect(
            repository.existsByEmailOrCpf({ email: "x@x.com", cpf: "1" }),
        ).resolves.toBe(false);
    });

    it("resolves the client only when a method runs", () => {
        const getClient = vi.fn(() => prisma);

        createUserRepository(getClient);

        expect(getClient).not.toHaveBeenCalled();
    });
});
