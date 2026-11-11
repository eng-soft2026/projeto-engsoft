import { z } from "zod";
import { MAX_PRICE_INTEGER_DIGITS } from "../../constants/room.js";
import { isValidCalendarDate } from "../../utils/calendar-date.js";
import { createDecimalInputSchema } from "../room-types/room-type-form.js";

export const PRICE_PERIOD_FORM_DEFAULT_VALUES = Object.freeze({
    startDate: "",
    endDate: "",
    price: "",
});

const DATE_RANGE_MESSAGE =
    "A data final deve ser igual ou posterior à inicial.";
const PAST_START_MESSAGE = "A data inicial não pode ser anterior a hoje.";

function createDateInputSchema(label) {
    return z
        .string()
        .trim()
        .min(1, { error: `Informe a ${label.toLowerCase()}.`, abort: true })
        .refine(isValidCalendarDate, { error: `${label} inválida.` });
}

export function createPricePeriodFormSchema(today) {
    return z
        .object({
            startDate: createDateInputSchema("Data inicial"),
            endDate: createDateInputSchema("Data final"),
            price: createDecimalInputSchema(
                "o preço do período",
                MAX_PRICE_INTEGER_DIGITS,
            ),
        })
        .refine(({ startDate, endDate }) => startDate <= endDate, {
            error: DATE_RANGE_MESSAGE,
            path: ["endDate"],
        })
        .refine(({ startDate }) => startDate >= today, {
            error: PAST_START_MESSAGE,
            path: ["startDate"],
        });
}

export function toPricePeriodFormValues(period) {
    return {
        startDate: period.startDate,
        endDate: period.endDate,
        price: String(period.price).replace(".", ","),
    };
}

export function hasPricePeriodStarted(period, today) {
    return period.startDate < today;
}
