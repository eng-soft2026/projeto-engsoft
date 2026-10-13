import { getPrisma } from "./prisma.js";

export function createTransactionRunner(getClient = getPrisma) {
    return Object.freeze({
        run(work) {
            return getClient().$transaction((client) => work(client));
        },
    });
}

export const transactionRunner = createTransactionRunner();
