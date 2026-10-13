import { Decimal } from "../generated/prisma/internal/prismaNamespace.ts";
import { MONEY_DECIMAL_PLACES } from "../constants/room.js";

export function createDecimalPattern(maxIntegerDigits) {
    return new RegExp(
        String.raw`^\d{1,${maxIntegerDigits}}(\.\d{1,${MONEY_DECIMAL_PLACES}})?$`,
    );
}

export function toDecimalString(value) {
    return new Decimal(value).toFixed(MONEY_DECIMAL_PLACES);
}

export function formatDecimal(value) {
    if (value === null || value === undefined) {
        return null;
    }
    return toDecimalString(value);
}
