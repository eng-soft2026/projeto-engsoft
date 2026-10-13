const CNPJ_INPUT_PATTERN =
    /^[0-9A-Z]{2}\.?[0-9A-Z]{3}\.?[0-9A-Z]{3}\/?[0-9A-Z]{4}-?\d{2}$/i;
const NON_ALPHANUMERIC_PATTERN = /[^0-9A-Z]/gi;
const REPEATED_CHARACTERS_PATTERN = /^(.)\1+$/;
const BASE_LENGTH = 12;
const CHARACTER_CODE_OFFSET = 48;
const MODULUS = 11;
const MIN_WEIGHT = 2;
const MAX_WEIGHT = 9;
const WEIGHT_COUNT = MAX_WEIGHT - MIN_WEIGHT + 1;

export function normalizeCnpj(value) {
    return String(value).replace(NON_ALPHANUMERIC_PATTERN, "").toUpperCase();
}

function toCheckValue(character) {
    return character.charCodeAt(0) - CHARACTER_CODE_OFFSET;
}

function calculateCheckDigit(characters) {
    const weightedSum = [...characters]
        .reverse()
        .reduce((sum, character, index) => {
            const weight = (index % WEIGHT_COUNT) + MIN_WEIGHT;
            return sum + toCheckValue(character) * weight;
        }, 0);
    const remainder = weightedSum % MODULUS;
    return remainder < 2 ? 0 : MODULUS - remainder;
}

export function isValidCnpj(value) {
    if (typeof value !== "string" || !CNPJ_INPUT_PATTERN.test(value)) {
        return false;
    }

    const cnpj = normalizeCnpj(value);
    if (REPEATED_CHARACTERS_PATTERN.test(cnpj)) {
        return false;
    }

    const base = cnpj.slice(0, BASE_LENGTH);
    const firstCheckDigit = calculateCheckDigit(base);
    const secondCheckDigit = calculateCheckDigit(`${base}${firstCheckDigit}`);

    return cnpj.slice(BASE_LENGTH) === `${firstCheckDigit}${secondCheckDigit}`;
}
