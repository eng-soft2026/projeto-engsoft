import { describe, expect, it } from "vitest";
import {
    PASSWORD_HASH_ROUNDS,
    passwordHasher,
} from "../../../src/modules/auth/password-hasher.js";

describe("passwordHasher", () => {
    it("uses at least the OWASP minimum work factor of 10", () => {
        expect(PASSWORD_HASH_ROUNDS).toBeGreaterThanOrEqual(10);
    });

    it("hashes with bcrypt and verifies the right password only", async () => {
        const passwordHash = await passwordHasher.hash("senhaSegura1");

        expect(passwordHash).not.toContain("senhaSegura1");
        expect(passwordHash).toMatch(
            new RegExp(`^\\$2[aby]\\$${PASSWORD_HASH_ROUNDS}\\$`),
        );
        await expect(
            passwordHasher.verify("senhaSegura1", passwordHash),
        ).resolves.toBe(true);
        await expect(
            passwordHasher.verify("outraSenha1", passwordHash),
        ).resolves.toBe(false);
    });

    it("always fails when verifying against the dummy hash", async () => {
        await expect(
            passwordHasher.verifyAgainstDummyHash("qualquerSenha1"),
        ).resolves.toBe(false);
    });
});
