import { randomInt, randomUUID } from "node:crypto";
import { USER_ROLES } from "../../../src/constants/user-roles.js";

export const TEST_PASSWORD = `Factory${randomUUID().slice(0, 8)}1`;

function calculateCpfDigit(digits) {
    const weightStart = digits.length + 1;
    const sum = digits.reduce(
        (total, digit, index) => total + digit * (weightStart - index),
        0,
    );
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
}

export function generateCpf() {
    const base = Array.from({ length: 9 }, () => randomInt(0, 10));
    if (new Set(base).size === 1) {
        base[0] = (base[0] + 1) % 10;
    }
    const firstDigit = calculateCpfDigit(base);
    const secondDigit = calculateCpfDigit([...base, firstDigit]);
    return [...base, firstDigit, secondDigit].join("");
}

export function buildUser(overrides = {}) {
    const tag = randomUUID().slice(0, 8);
    return {
        name: `Test User ${tag}`,
        email: `user-${tag}@example.com`,
        cpf: generateCpf(),
        password: TEST_PASSWORD,
        role: USER_ROLES.CUSTOMER,
        ...overrides,
    };
}
