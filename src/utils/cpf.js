const CPF_INPUT_PATTERN = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;
const REPEATED_DIGITS_PATTERN = /^(\d)\1+$/;
const BASE_DIGITS_LENGTH = 9;

export function normalizeCpf(value) {
    return String(value).replace(/\D/g, "");
}

function calculateCheckDigit(digits) {
    const firstWeight = digits.length + 1;
    const weightedSum = digits.reduce(
        (sum, digit, index) => sum + digit * (firstWeight - index),
        0,
    );
    const remainder = (weightedSum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
}

export function isValidCpf(value) {
    if (typeof value !== "string" || !CPF_INPUT_PATTERN.test(value)) {
        return false;
    }

    const cpf = normalizeCpf(value);
    if (REPEATED_DIGITS_PATTERN.test(cpf)) {
        return false;
    }

    const digits = [...cpf].map(Number);
    const firstCheckDigit = calculateCheckDigit(
        digits.slice(0, BASE_DIGITS_LENGTH),
    );
    const secondCheckDigit = calculateCheckDigit(
        digits.slice(0, BASE_DIGITS_LENGTH + 1),
    );

    return (
        firstCheckDigit === digits[BASE_DIGITS_LENGTH] &&
        secondCheckDigit === digits[BASE_DIGITS_LENGTH + 1]
    );
}
