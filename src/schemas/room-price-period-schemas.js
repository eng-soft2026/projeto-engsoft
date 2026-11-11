import { z } from "zod";
import { isValidCalendarDate } from "../utils/calendar-date.js";
import { priceSchema } from "./room-type-schemas.js";

const DATE_RANGE_MESSAGE =
    "A data final deve ser igual ou posterior à inicial.";

function createCalendarDateSchema(label) {
    const message = `${label} inválida. Use o formato AAAA-MM-DD.`;
    return z
        .string({ error: `Informe a ${label.toLowerCase()}.` })
        .trim()
        .refine(isValidCalendarDate, { error: message });
}

function hasAnyChange(data) {
    return Object.values(data).some((value) => value !== undefined);
}

function hasOrderedDates({ startDate, endDate }) {
    if (startDate === undefined || endDate === undefined) {
        return true;
    }
    return startDate <= endDate;
}

const startDateSchema = createCalendarDateSchema("Data inicial");
const endDateSchema = createCalendarDateSchema("Data final");

export const createRoomPricePeriodSchema = z
    .object(
        {
            startDate: startDateSchema,
            endDate: endDateSchema,
            price: priceSchema,
        },
        { error: "Envie os dados do período." },
    )
    .refine(hasOrderedDates, { error: DATE_RANGE_MESSAGE, path: ["endDate"] });

export const updateRoomPricePeriodSchema = z
    .object(
        {
            startDate: startDateSchema.optional(),
            endDate: endDateSchema.optional(),
            price: priceSchema.optional(),
        },
        { error: "Envie os dados do período." },
    )
    .refine(hasAnyChange, {
        error: "Informe ao menos um campo para atualizar.",
    })
    .refine(hasOrderedDates, { error: DATE_RANGE_MESSAGE, path: ["endDate"] });

export const roomPricePeriodParamsSchema = z.object(
    { id: z.uuid({ error: "Identificador de período inválido." }) },
    { error: "Identificador de período inválido." },
);
