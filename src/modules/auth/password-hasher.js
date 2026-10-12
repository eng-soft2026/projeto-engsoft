import bcrypt from "bcryptjs";

export const PASSWORD_HASH_ROUNDS = 12;

let dummyHashPromise;

function getDummyHash() {
    dummyHashPromise ??= bcrypt.hash(crypto.randomUUID(), PASSWORD_HASH_ROUNDS);
    return dummyHashPromise;
}

export const passwordHasher = Object.freeze({
    hash(password) {
        return bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
    },

    verify(password, passwordHash) {
        return bcrypt.compare(password, passwordHash);
    },

    async verifyAgainstDummyHash(password) {
        await bcrypt.compare(password, await getDummyHash());
        return false;
    },
});
