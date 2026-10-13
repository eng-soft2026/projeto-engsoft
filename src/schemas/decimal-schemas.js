import { z } from "zod";
import { createDecimalPattern, toDecimalString } from "../utils/money.js";

export function createPositiveDecimalSchema(label, maxIntegerDigits) {
    const pattern = createDecimalPattern(maxIntegerDigits);
    const message = `${label} inválido. Use um valor positivo com até 2 casas decimais.`;
    return z
        .union([z.string(), z.number()], { error: `Informe ${label}.` })
        .transform((value) => String(value).trim())
        .refine((value) => pattern.test(value) && Number(value) > 0, {
            error: message,
        })
        .transform(toDecimalString);
}
