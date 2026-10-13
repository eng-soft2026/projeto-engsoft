import { z } from "zod";
import { ACCEPTANCE_TYPE_CODES } from "../constants/acceptance-types.js";

const MAX_ACCEPTANCES = 30;
const CUSTOM_LABEL_MAX_LENGTH = 150;
const DETAILS_MAX_LENGTH = 2000;

const customLabelSchema = z
    .string({ error: "O rótulo da regra deve ser um texto." })
    .trim()
    .min(1, { error: "Informe o rótulo da regra." })
    .max(CUSTOM_LABEL_MAX_LENGTH, {
        error: `O rótulo deve ter no máximo ${CUSTOM_LABEL_MAX_LENGTH} caracteres.`,
    });

const detailsSchema = z
    .string({ error: "Os detalhes devem ser um texto." })
    .trim()
    .max(DETAILS_MAX_LENGTH, {
        error: `Os detalhes devem ter no máximo ${DETAILS_MAX_LENGTH} caracteres.`,
    })
    .transform((details) => (details === "" ? null : details));

const acceptanceSchema = z
    .object(
        {
            type: z.enum(Object.values(ACCEPTANCE_TYPE_CODES), {
                error: "Tipo de regra de aceitação inválido.",
            }),
            customLabel: customLabelSchema.nullish(),
            isAllowed: z.boolean({
                error: "Informe se a regra é aceita ou não.",
            }),
            details: detailsSchema.nullish(),
        },
        { error: "Regra de aceitação inválida." },
    )
    .superRefine((acceptance, context) => {
        const isOther = acceptance.type === ACCEPTANCE_TYPE_CODES.OTHER;
        const hasLabel = Boolean(acceptance.customLabel);
        if (isOther && !hasLabel) {
            context.addIssue({
                code: "custom",
                message: "Informe o rótulo da regra do tipo OTHER.",
            });
        }
        if (!isOther && hasLabel) {
            context.addIssue({
                code: "custom",
                message: "Apenas o tipo OTHER aceita rótulo próprio.",
            });
        }
    })
    .transform(({ type, customLabel, isAllowed, details }) => ({
        type,
        customLabel: customLabel ?? null,
        isAllowed,
        details: details ?? null,
    }));

function buildRuleKey({ type, customLabel }) {
    return `${type}:${customLabel?.toLowerCase() ?? ""}`;
}

export const replaceAcceptancesSchema = z.object(
    {
        acceptances: z
            .array(acceptanceSchema, { error: "Envie a lista de regras." })
            .max(MAX_ACCEPTANCES, {
                error: `Informe no máximo ${MAX_ACCEPTANCES} regras.`,
            })
            .refine(
                (acceptances) =>
                    new Set(acceptances.map(buildRuleKey)).size ===
                    acceptances.length,
                {
                    error: "Há regras repetidas: use um tipo padronizado uma vez e rótulos diferentes em OTHER.",
                },
            ),
    },
    { error: "Envie a lista de regras." },
);
