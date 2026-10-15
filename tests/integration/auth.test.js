import { beforeEach, describe, expect, it, vi } from "vitest";
import { USER_ROLES } from "../../src/constants/user-roles.js";
import { getPrisma } from "../../src/lib/prisma.js";
import { parseWithSchema } from "../../src/lib/validation.js";
import { auth } from "../../src/modules/auth/auth.js";
import { requireAuth, requireRole } from "../../src/modules/auth/guards.js";
import { passwordHasher } from "../../src/modules/auth/password-hasher.js";
import { updateProfileSchema } from "../../src/schemas/user-schemas.js";
import { authService } from "../../src/services/auth-service.js";
import { userService } from "../../src/services/user-service.js";
import { resetDatabase, seedBaseData } from "./helpers/database.js";
import { TEST_PASSWORD, buildAccount, createUser } from "./helpers/fixtures.js";
import { flushRedis } from "./helpers/redis.js";

vi.mock("../../src/modules/auth/auth.js", () => ({ auth: vi.fn() }));

function findStoredUser(id) {
    return getPrisma().user.findUnique({ where: { id } });
}

function signInAs(user) {
    auth.mockResolvedValue({ user: { id: user.id, role: user.role } });
}

describe("auth and users against MySQL", () => {
    beforeEach(async () => {
        await resetDatabase();
        await seedBaseData();
        await flushRedis();
        auth.mockReset();
    });

    it("stores a real bcrypt hash and never returns it", async () => {
        const user = await createUser();

        const stored = await findStoredUser(user.id);

        expect(user).not.toHaveProperty("passwordHash");
        expect(stored.passwordHash).not.toBe(TEST_PASSWORD);
        await expect(
            passwordHasher.verify(TEST_PASSWORD, stored.passwordHash),
        ).resolves.toBe(true);
    });

    it("rejects a second account with the same e-mail or CPF", async () => {
        const account = buildAccount();
        await createUser(account);

        await expect(
            createUser({ ...account, email: "other@example.com" }),
        ).rejects.toMatchObject({ code: "USER_ALREADY_EXISTS" });
        await expect(
            createUser({ ...buildAccount(), email: account.email }),
        ).rejects.toMatchObject({ code: "USER_ALREADY_EXISTS" });
    });

    it("verifies credentials against the stored hash", async () => {
        const user = await createUser();

        await expect(
            authService.verifyCredentials({
                email: user.email,
                password: TEST_PASSWORD,
            }),
        ).resolves.toEqual({
            id: user.id,
            name: user.name,
            email: user.email,
            role: USER_ROLES.MANAGER,
        });
        await expect(
            authService.verifyCredentials({
                email: user.email,
                password: "Wrong123456",
            }),
        ).resolves.toBeNull();
        await expect(
            authService.verifyCredentials({
                email: "missing@example.com",
                password: TEST_PASSWORD,
            }),
        ).resolves.toBeNull();
    });

    it("updates the profile and the password in MySQL", async () => {
        const user = await createUser();
        const changes = parseWithSchema(updateProfileSchema, {
            name: "Nome Atualizado",
            email: "atualizado@example.com",
            newPassword: "NewPassword123",
            currentPassword: TEST_PASSWORD,
        });

        const updated = await userService.updateProfile(user.id, changes);

        expect(updated).toMatchObject({
            name: "Nome Atualizado",
            email: "atualizado@example.com",
        });
        await expect(
            authService.verifyCredentials({
                email: "atualizado@example.com",
                password: "NewPassword123",
            }),
        ).resolves.toMatchObject({ id: user.id });
        await expect(
            authService.verifyCredentials({
                email: "atualizado@example.com",
                password: TEST_PASSWORD,
            }),
        ).resolves.toBeNull();
    });

    it("refuses a profile change with the wrong current password", async () => {
        const user = await createUser();

        await expect(
            userService.updateProfile(user.id, {
                newPassword: "NewPassword123",
                currentPassword: "Wrong123456",
            }),
        ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
        const stored = await findStoredUser(user.id);
        await expect(
            passwordHasher.verify(TEST_PASSWORD, stored.passwordHash),
        ).resolves.toBe(true);
    });

    it("refuses an e-mail already taken by another user", async () => {
        const user = await createUser();
        const other = await createUser();

        await expect(
            userService.updateProfile(user.id, { email: other.email }),
        ).rejects.toMatchObject({ code: "USER_ALREADY_EXISTS" });
    });

    it("accepts the session of an active user", async () => {
        const user = await createUser();
        signInAs(user);

        await expect(requireAuth()).resolves.toMatchObject({ id: user.id });
        await expect(requireRole([USER_ROLES.MANAGER])).resolves.toMatchObject({
            id: user.id,
        });
    });

    it("rejects the old session of a user deactivated in MySQL", async () => {
        const user = await createUser();
        signInAs(user);
        await getPrisma().user.update({
            where: { id: user.id },
            data: { isActive: false },
        });

        await expect(requireAuth()).rejects.toMatchObject({
            code: "UNAUTHORIZED",
        });
        await expect(
            authService.verifyCredentials({
                email: user.email,
                password: TEST_PASSWORD,
            }),
        ).resolves.toBeNull();
    });

    it("uses the role stored in MySQL instead of the session role", async () => {
        const user = await createUser();
        auth.mockResolvedValue({
            user: { id: user.id, role: USER_ROLES.ADMIN },
        });

        await expect(requireRole([USER_ROLES.ADMIN])).rejects.toMatchObject({
            code: "FORBIDDEN",
        });
    });
});
