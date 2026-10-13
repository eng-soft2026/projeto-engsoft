import { describe, expect, it, vi } from "vitest";
import { createTransactionRunner } from "../../src/lib/transaction.js";

function createFakePrisma() {
    const transactionClient = { id: "transaction-client" };
    return {
        transactionClient,
        $transaction: vi.fn(async (callback) => callback(transactionClient)),
    };
}

describe("transactionRunner", () => {
    it("runs the work inside a Prisma interactive transaction", async () => {
        const prisma = createFakePrisma();
        const runner = createTransactionRunner(() => prisma);
        const work = vi.fn(async () => "done");

        await expect(runner.run(work)).resolves.toBe("done");

        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(work).toHaveBeenCalledWith(prisma.transactionClient);
    });

    it("rejects with the error thrown by the work, so Prisma rolls back", async () => {
        const prisma = createFakePrisma();
        const runner = createTransactionRunner(() => prisma);
        const failure = new Error("audit insert failed");

        await expect(
            runner.run(async () => {
                throw failure;
            }),
        ).rejects.toBe(failure);
    });

    it("resolves the client only when the work runs", async () => {
        const prisma = createFakePrisma();
        const getClient = vi.fn(() => prisma);

        const runner = createTransactionRunner(getClient);

        expect(getClient).not.toHaveBeenCalled();
        await runner.run(async () => null);
        expect(getClient).toHaveBeenCalledTimes(1);
    });
});
