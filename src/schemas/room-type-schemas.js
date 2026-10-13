import { z } from "zod";
import { BED_TYPES } from "../constants/bed-types.js";
import {
    MAX_AREA_INTEGER_DIGITS,
    MAX_BED_QUANTITY,
    MAX_PRICE_INTEGER_DIGITS,
    MAX_ROOM_TYPE_BEDS,
    MAX_ROOM_TYPE_GUESTS,
    MIN_BED_QUANTITY,
    MIN_ROOM_TYPE_BEDS,
    MIN_ROOM_TYPE_GUESTS,
} from "../constants/room.js";
import { createPositiveDecimalSchema } from "./decimal-schemas.js";

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 150;
const DESCRIPTION_MAX_LENGTH = 5000;

function hasAnyChange(data) {
    return Object.values(data).some((value) => value !== undefined);
}

const nameSchema = z
    .string({ error: "Informe o nome do tipo de acomodação." })
    .trim()
    .min(NAME_MIN_LENGTH, {
        error: `O nome deve ter pelo menos ${NAME_MIN_LENGTH} caracteres.`,
    })
    .max(NAME_MAX_LENGTH, {
        error: `O nome deve ter no máximo ${NAME_MAX_LENGTH} caracteres.`,
    });

const descriptionSchema = z
    .string({ error: "Informe a descrição do tipo de acomodação." })
    .trim()
    .min(1, { error: "Informe a descrição do tipo de acomodação." })
    .max(DESCRIPTION_MAX_LENGTH, {
        error: `A descrição deve ter no máximo ${DESCRIPTION_MAX_LENGTH} caracteres.`,
    });

const maxGuestsSchema = z
    .number({ error: "A capacidade deve ser um número inteiro." })
    .int({ error: "A capacidade deve ser um número inteiro." })
    .min(MIN_ROOM_TYPE_GUESTS, {
        error: `A capacidade deve ser no mínimo ${MIN_ROOM_TYPE_GUESTS}.`,
    })
    .max(MAX_ROOM_TYPE_GUESTS, {
        error: `A capacidade deve ser no máximo ${MAX_ROOM_TYPE_GUESTS}.`,
    });

export const areaSchema = createPositiveDecimalSchema(
    "a área em m²",
    MAX_AREA_INTEGER_DIGITS,
);

export const priceSchema = createPositiveDecimalSchema(
    "o preço",
    MAX_PRICE_INTEGER_DIGITS,
);

const bedSchema = z.object(
    {
        bedType: z.enum(Object.values(BED_TYPES), {
            error: "Tipo de cama inválido.",
        }),
        quantity: z
            .number({ error: "A quantidade de camas deve ser um inteiro." })
            .int({ error: "A quantidade de camas deve ser um inteiro." })
            .min(MIN_BED_QUANTITY, {
                error: `A quantidade de camas deve ser no mínimo ${MIN_BED_QUANTITY}.`,
            })
            .max(MAX_BED_QUANTITY, {
                error: `A quantidade de camas deve ser no máximo ${MAX_BED_QUANTITY}.`,
            }),
    },
    { error: "Configuração de cama inválida." },
);

const bedsSchema = z
    .array(bedSchema, { error: "Envie a lista de camas." })
    .min(MIN_ROOM_TYPE_BEDS, {
        error: `Informe ao menos ${MIN_ROOM_TYPE_BEDS} configuração de cama.`,
    })
    .max(MAX_ROOM_TYPE_BEDS, {
        error: `Informe no máximo ${MAX_ROOM_TYPE_BEDS} configurações de cama.`,
    })
    .refine(
        (beds) =>
            new Set(beds.map(({ bedType }) => bedType)).size === beds.length,
        { error: "Há tipos de cama repetidos." },
    );

export const createRoomTypeSchema = z.object(
    {
        name: nameSchema,
        description: descriptionSchema,
        maxGuests: maxGuestsSchema,
        areaM2: areaSchema,
        defaultPrice: priceSchema,
        beds: bedsSchema,
    },
    { error: "Envie os dados do tipo de acomodação." },
);

export const updateRoomTypeSchema = z
    .object(
        {
            name: nameSchema.optional(),
            description: descriptionSchema.optional(),
            maxGuests: maxGuestsSchema.optional(),
            areaM2: areaSchema.optional(),
            defaultPrice: priceSchema.optional(),
            beds: bedsSchema.optional(),
            isActive: z
                .literal(false, {
                    error: "Um tipo de acomodação desativado não pode ser reativado.",
                })
                .optional(),
        },
        { error: "Envie os dados do tipo de acomodação." },
    )
    .refine(hasAnyChange, {
        error: "Informe ao menos um campo para atualizar.",
    });

export const roomTypeParamsSchema = z.object(
    { id: z.uuid({ error: "Identificador de tipo de acomodação inválido." }) },
    { error: "Identificador de tipo de acomodação inválido." },
);
