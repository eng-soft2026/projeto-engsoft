import { z } from "zod";
import { AUDIT_REASON_MAX_LENGTH } from "../constants/audit.js";
import { HOTEL_STATUSES } from "../constants/hotel-statuses.js";
import { ERROR_CODES } from "../lib/errors.js";
import { UNBLOCK_TARGET_STATUSES } from "../modules/hotels/hotel-status-machine.js";
import { isValidCnpj, normalizeCnpj } from "../utils/cnpj.js";
import { emailSchema } from "./common-schemas.js";

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 150;
const DESCRIPTION_MAX_LENGTH = 5000;
const CATEGORY_MAX_LENGTH = 50;

function hasAnyHotelChange(data) {
    return Object.values(data).some((value) => value !== undefined);
}

const nameSchema = z
    .string({ error: "Informe o nome do hotel." })
    .trim()
    .min(NAME_MIN_LENGTH, {
        error: `O nome do hotel deve ter pelo menos ${NAME_MIN_LENGTH} caracteres.`,
    })
    .max(NAME_MAX_LENGTH, {
        error: `O nome do hotel deve ter no máximo ${NAME_MAX_LENGTH} caracteres.`,
    });

const descriptionSchema = z
    .string({ error: "Informe a descrição do hotel." })
    .trim()
    .min(1, { error: "Informe a descrição do hotel." })
    .max(DESCRIPTION_MAX_LENGTH, {
        error: `A descrição deve ter no máximo ${DESCRIPTION_MAX_LENGTH} caracteres.`,
    });

const categorySchema = z
    .string({ error: "Informe a categoria do hotel." })
    .trim()
    .min(1, { error: "Informe a categoria do hotel." })
    .max(CATEGORY_MAX_LENGTH, {
        error: `A categoria deve ter no máximo ${CATEGORY_MAX_LENGTH} caracteres.`,
    });

const cnpjSchema = z
    .string({ error: "Informe o CNPJ." })
    .trim()
    .refine(isValidCnpj, {
        error: "CNPJ inválido.",
        params: { errorCode: ERROR_CODES.INVALID_CNPJ },
    })
    .transform(normalizeCnpj);

const reasonSchema = z
    .string({ error: "Informe o motivo da ação." })
    .trim()
    .min(1, { error: "Informe o motivo da ação." })
    .max(AUDIT_REASON_MAX_LENGTH, {
        error: `O motivo deve ter no máximo ${AUDIT_REASON_MAX_LENGTH} caracteres.`,
    });

export const createHotelSchema = z.object(
    {
        name: nameSchema,
        description: descriptionSchema,
        category: categorySchema,
        cnpj: cnpjSchema,
        email: emailSchema,
    },
    { error: "Envie os dados do hotel." },
);

export const updateHotelSchema = z
    .object(
        {
            name: nameSchema.optional(),
            description: descriptionSchema.optional(),
            category: categorySchema.optional(),
            cnpj: cnpjSchema.optional(),
            email: emailSchema.optional(),
        },
        { error: "Envie os dados do hotel." },
    )
    .refine(hasAnyHotelChange, {
        error: "Informe ao menos um campo para atualizar.",
    });

export const hotelReviewActionSchema = z.object(
    { reason: reasonSchema },
    { error: "Envie o motivo da ação." },
);

export const unblockHotelSchema = z.object(
    {
        reason: reasonSchema,
        targetStatus: z.enum(UNBLOCK_TARGET_STATUSES, {
            error: "Informe o status de destino: PUBLISHED ou DRAFT.",
        }),
    },
    { error: "Envie o motivo e o status de destino." },
);

export const listHotelsQuerySchema = z.object(
    {
        status: z
            .enum(Object.values(HOTEL_STATUSES), {
                error: "Status de hotel inválido.",
            })
            .optional(),
    },
    { error: "Parâmetros de consulta inválidos." },
);

export const hotelParamsSchema = z.object(
    { id: z.uuid({ error: "Identificador de hotel inválido." }) },
    { error: "Identificador de hotel inválido." },
);
