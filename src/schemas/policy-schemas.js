import { z } from "zod";
import { HOTEL_POLICY_TYPES } from "../constants/hotel-policy-types.js";

const TITLE_MIN_LENGTH = 2;
const TITLE_MAX_LENGTH = 150;
const DESCRIPTION_MAX_LENGTH = 5000;

function hasAnyChange(data) {
    return Object.values(data).some((value) => value !== undefined);
}

const typeSchema = z.enum(Object.values(HOTEL_POLICY_TYPES), {
    error: "Tipo de política inválido.",
});

const titleSchema = z
    .string({ error: "Informe o título da política." })
    .trim()
    .min(TITLE_MIN_LENGTH, {
        error: `O título deve ter pelo menos ${TITLE_MIN_LENGTH} caracteres.`,
    })
    .max(TITLE_MAX_LENGTH, {
        error: `O título deve ter no máximo ${TITLE_MAX_LENGTH} caracteres.`,
    });

const descriptionSchema = z
    .string({ error: "Informe a descrição da política." })
    .trim()
    .min(1, { error: "Informe a descrição da política." })
    .max(DESCRIPTION_MAX_LENGTH, {
        error: `A descrição deve ter no máximo ${DESCRIPTION_MAX_LENGTH} caracteres.`,
    });

export const createPolicySchema = z.object(
    { type: typeSchema, title: titleSchema, description: descriptionSchema },
    { error: "Envie os dados da política." },
);

export const updatePolicySchema = z
    .object(
        {
            type: typeSchema.optional(),
            title: titleSchema.optional(),
            description: descriptionSchema.optional(),
            isActive: z
                .boolean({ error: "Informe se a política está ativa." })
                .optional(),
        },
        { error: "Envie os dados da política." },
    )
    .refine(hasAnyChange, {
        error: "Informe ao menos um campo para atualizar.",
    });

export const policyParamsSchema = z.object(
    { id: z.uuid({ error: "Identificador de política inválido." }) },
    { error: "Identificador de política inválido." },
);
