import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaClientConstructor = vi.fn();
const adapterConstructor = vi.fn();

vi.mock("../../src/generated/prisma/client.ts", () => ({
    PrismaClient: class {
        constructor(options) {
            prismaClientConstructor(options);
        }
    },
}));

vi.mock("@prisma/adapter-mariadb", () => ({
    PrismaMariaDb: class {
        constructor(url) {
            adapterConstructor(url);
        }
    },
}));

describe("getPrisma", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        delete globalThis.prismaClient;
        vi.stubEnv("DATABASE_URL", "mysql://user:pass@localhost:3306/test");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("does not create a client on import", async () => {
        await import("../../src/lib/prisma.js");

        expect(prismaClientConstructor).not.toHaveBeenCalled();
    });

    it("creates the client with the MariaDB adapter using DATABASE_URL", async () => {
        const { getPrisma } = await import("../../src/lib/prisma.js");

        getPrisma();

        expect(adapterConstructor).toHaveBeenCalledWith(
            "mysql://user:pass@localhost:3306/test",
        );
        expect(prismaClientConstructor).toHaveBeenCalledTimes(1);
    });

    it("returns the same instance on repeated calls", async () => {
        const { getPrisma } = await import("../../src/lib/prisma.js");

        expect(getPrisma()).toBe(getPrisma());
        expect(prismaClientConstructor).toHaveBeenCalledTimes(1);
    });

    it("throws when DATABASE_URL is missing", async () => {
        vi.stubEnv("DATABASE_URL", "");
        const { getPrisma } = await import("../../src/lib/prisma.js");

        expect(() => getPrisma()).toThrow("DATABASE_URL is not defined");
    });
});
