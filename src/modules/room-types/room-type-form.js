import { z } from "zod";
import { BED_TYPES } from "../../constants/bed-types.js";
import {
    MAX_AREA_INTEGER_DIGITS,
    MAX_BED_QUANTITY,
    MAX_PRICE_INTEGER_DIGITS,
    MAX_ROOM_TYPE_BEDS,
    MAX_ROOM_TYPE_GUESTS,
    MIN_BED_QUANTITY,
    MIN_ROOM_TYPE_BEDS,
    MIN_ROOM_TYPE_GUESTS,
    MONEY_DECIMAL_PLACES,
} from "../../constants/room.js";

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 150;
const DESCRIPTION_MAX_LENGTH = 5000;

export const MAX_BED_ROWS = Math.min(
    MAX_ROOM_TYPE_BEDS,
    Object.keys(BED_TYPES).length,
);

export { MIN_BED_QUANTITY, MAX_BED_QUANTITY, MIN_ROOM_TYPE_BEDS };

export const EMPTY_BED = Object.freeze({
    bedType: "",
    quantity: MIN_BED_QUANTITY,
});

export const ROOM_TYPE_FORM_DEFAULT_VALUES = Object.freeze({
    name: "",
    description: "",
    maxGuests: MIN_ROOM_TYPE_GUESTS,
    areaM2: "",
    defaultPrice: "",
    beds: Object.freeze([EMPTY_BED]),
});

function padFraction(value) {
    const [integerPart, fractionPart = ""] = value.split(".");
    return `${integerPart}.${fractionPart.padEnd(MONEY_DECIMAL_PLACES, "0")}`;
}

export function createDecimalInputSchema(label, maxIntegerDigits) {
    const pattern = new RegExp(
        String.raw`^\d{1,${maxIntegerDigits}}(\.\d{1,${MONEY_DECIMAL_PLACES}})?$`,
    );
    return z
        .string({ error: `Informe ${label}.` })
        .trim()
        .min(1, { error: `Informe ${label}.` })
        .transform((value) => value.replace(",", "."))
        .refine((value) => pattern.test(value) && Number(value) > 0, {
            error: `Valor inválido. Use um número positivo com até ${MONEY_DECIMAL_PLACES} casas decimais.`,
        })
        .transform(padFraction);
}

const priceInputSchema = createDecimalInputSchema(
    "o preço padrão",
    MAX_PRICE_INTEGER_DIGITS,
);

const areaInputSchema = createDecimalInputSchema(
    "a área",
    MAX_AREA_INTEGER_DIGITS,
);

function addDuplicateBedIssues(beds, context) {
    const seenBedTypes = new Set();
    beds.forEach(({ bedType }, index) => {
        if (!seenBedTypes.has(bedType)) {
            seenBedTypes.add(bedType);
            return;
        }
        context.addIssue({
            code: "custom",
            message: "Tipo de cama repetido.",
            path: [index, "bedType"],
        });
    });
}

const bedEntrySchema = z.object({
    bedType: z.enum(Object.values(BED_TYPES), {
        error: "Selecione o tipo de cama.",
    }),
    quantity: z
        .number({ error: "Informe a quantidade de camas." })
        .int({ error: "A quantidade de camas deve ser um inteiro." })
        .min(MIN_BED_QUANTITY, {
            error: `A quantidade deve ser no mínimo ${MIN_BED_QUANTITY}.`,
        })
        .max(MAX_BED_QUANTITY, {
            error: `A quantidade deve ser no máximo ${MAX_BED_QUANTITY}.`,
        }),
});

export const roomTypeFormSchema = z.object({
    name: z
        .string()
        .trim()
        .min(NAME_MIN_LENGTH, {
            error: `O nome deve ter pelo menos ${NAME_MIN_LENGTH} caracteres.`,
        })
        .max(NAME_MAX_LENGTH, {
            error: `O nome deve ter no máximo ${NAME_MAX_LENGTH} caracteres.`,
        }),
    description: z
        .string()
        .trim()
        .min(1, { error: "Informe a descrição do tipo de acomodação." })
        .max(DESCRIPTION_MAX_LENGTH, {
            error: `A descrição deve ter no máximo ${DESCRIPTION_MAX_LENGTH} caracteres.`,
        }),
    maxGuests: z
        .number({ error: "Informe a capacidade." })
        .int({ error: "A capacidade deve ser um número inteiro." })
        .min(MIN_ROOM_TYPE_GUESTS, {
            error: `A capacidade deve ser no mínimo ${MIN_ROOM_TYPE_GUESTS}.`,
        })
        .max(MAX_ROOM_TYPE_GUESTS, {
            error: `A capacidade deve ser no máximo ${MAX_ROOM_TYPE_GUESTS}.`,
        }),
    areaM2: areaInputSchema,
    defaultPrice: priceInputSchema,
    beds: z
        .array(bedEntrySchema)
        .min(MIN_ROOM_TYPE_BEDS, {
            error: `Informe ao menos ${MIN_ROOM_TYPE_BEDS} configuração de cama.`,
        })
        .max(MAX_BED_ROWS, {
            error: `Informe no máximo ${MAX_BED_ROWS} configurações de cama.`,
        })
        .superRefine(addDuplicateBedIssues),
});

export const roomTypePriceFormSchema = z.object({
    defaultPrice: priceInputSchema,
});

function toDecimalInput(value) {
    return String(value).replace(".", ",");
}

export function toRoomTypeFormValues(roomType) {
    return {
        name: roomType.name,
        description: roomType.description,
        maxGuests: roomType.maxGuests,
        areaM2: toDecimalInput(roomType.areaM2),
        defaultPrice: toDecimalInput(roomType.defaultPrice),
        beds: roomType.beds.map(({ bedType, quantity }) => ({
            bedType,
            quantity,
        })),
    };
}

export function toRoomTypePayload(values) {
    return {
        name: values.name,
        description: values.description,
        maxGuests: values.maxGuests,
        areaM2: values.areaM2,
        defaultPrice: values.defaultPrice,
        beds: values.beds.map(({ bedType, quantity }) => ({
            bedType,
            quantity,
        })),
    };
}

export function toRoomTypePricePayload(values) {
    return { defaultPrice: values.defaultPrice };
}
