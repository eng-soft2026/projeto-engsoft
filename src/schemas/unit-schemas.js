import { z } from "zod";
import {
    BRAZILIAN_STATES,
    MAX_UNIT_PHONES,
    MIN_UNIT_OVERBOOKING_PERCENT,
    MIN_UNIT_PHONES,
    PLATFORM_MAX_OVERBOOKING_PERCENT,
} from "../constants/unit.js";
import {
    isValidBrazilianPhone,
    normalizePhone,
} from "../utils/brazilian-phone.js";
import { isValidTimeOfDay } from "../utils/time-of-day.js";
import { isValidZipCode, normalizeZipCode } from "../utils/zip-code.js";
import { emailSchema } from "./common-schemas.js";

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 150;

function hasAnyUnitChange(data) {
    return Object.values(data).some((value) => value !== undefined);
}

function createRequiredText(label, maxLength) {
    return z
        .string({ error: `Informe ${label}.` })
        .trim()
        .min(1, { error: `Informe ${label}.` })
        .max(maxLength, {
            error: `${label} deve ter no máximo ${maxLength} caracteres.`,
        });
}

const nameSchema = z
    .string({ error: "Informe o nome da unidade." })
    .trim()
    .min(NAME_MIN_LENGTH, {
        error: `O nome da unidade deve ter pelo menos ${NAME_MIN_LENGTH} caracteres.`,
    })
    .max(NAME_MAX_LENGTH, {
        error: `O nome da unidade deve ter no máximo ${NAME_MAX_LENGTH} caracteres.`,
    });

const timeOfDaySchema = (label) =>
    z
        .string({ error: `Informe o horário de ${label}.` })
        .trim()
        .refine(isValidTimeOfDay, {
            error: `Horário de ${label} inválido. Use o formato HH:mm.`,
        });

export const overbookingPercentageSchema = z
    .number({ error: "O overbooking deve ser um número inteiro." })
    .int({ error: "O overbooking deve ser um número inteiro." })
    .min(MIN_UNIT_OVERBOOKING_PERCENT, {
        error: `O overbooking deve ser no mínimo ${MIN_UNIT_OVERBOOKING_PERCENT}%.`,
    })
    .max(PLATFORM_MAX_OVERBOOKING_PERCENT, {
        error: `O overbooking deve ser no máximo ${PLATFORM_MAX_OVERBOOKING_PERCENT}%.`,
    });

const zipCodeSchema = z
    .string({ error: "Informe o CEP." })
    .trim()
    .refine(isValidZipCode, { error: "CEP inválido." })
    .transform(normalizeZipCode);

const stateSchema = z
    .string({ error: "Informe a UF." })
    .trim()
    .toUpperCase()
    .refine((value) => BRAZILIAN_STATES.includes(value), {
        error: "UF inválida.",
    });

const addressSchema = z.object(
    {
        zipCode: zipCodeSchema,
        street: createRequiredText("o logradouro", 200),
        number: createRequiredText("o número", 20),
        complement: z
            .string({ error: "Complemento inválido." })
            .trim()
            .max(100, {
                error: "O complemento deve ter no máximo 100 caracteres.",
            })
            .transform((value) => (value === "" ? null : value))
            .nullish(),
        neighborhood: createRequiredText("o bairro", 100),
        city: createRequiredText("a cidade", 100),
        state: stateSchema,
    },
    { error: "Envie o endereço da unidade." },
);

const phoneSchema = z
    .string({ error: "Informe o telefone." })
    .trim()
    .refine(isValidBrazilianPhone, { error: "Telefone inválido." })
    .transform(normalizePhone);

const phonesSchema = z
    .array(phoneSchema, { error: "Envie a lista de telefones." })
    .min(MIN_UNIT_PHONES, {
        error: `Informe ao menos ${MIN_UNIT_PHONES} telefone.`,
    })
    .max(MAX_UNIT_PHONES, {
        error: `Informe no máximo ${MAX_UNIT_PHONES} telefones.`,
    })
    .refine((phones) => new Set(phones).size === phones.length, {
        error: "Há telefones repetidos.",
    });

export const createUnitSchema = z.object(
    {
        name: nameSchema,
        email: emailSchema,
        checkInTime: timeOfDaySchema("check-in"),
        checkOutTime: timeOfDaySchema("check-out"),
        overbookingPercentage: overbookingPercentageSchema.default(
            MIN_UNIT_OVERBOOKING_PERCENT,
        ),
        address: addressSchema,
        phones: phonesSchema,
    },
    { error: "Envie os dados da unidade." },
);

export const updateUnitSchema = z
    .object(
        {
            name: nameSchema.optional(),
            email: emailSchema.optional(),
            checkInTime: timeOfDaySchema("check-in").optional(),
            checkOutTime: timeOfDaySchema("check-out").optional(),
            overbookingPercentage: overbookingPercentageSchema.optional(),
            address: addressSchema.optional(),
            phones: phonesSchema.optional(),
            isActive: z
                .literal(false, {
                    error: "Uma unidade desativada não pode ser reativada.",
                })
                .optional(),
        },
        { error: "Envie os dados da unidade." },
    )
    .refine(hasAnyUnitChange, {
        error: "Informe ao menos um campo para atualizar.",
    });

export const unitParamsSchema = z.object(
    { id: z.uuid({ error: "Identificador de unidade inválido." }) },
    { error: "Identificador de unidade inválido." },
);
