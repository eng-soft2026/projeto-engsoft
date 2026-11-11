import { z } from "zod";
import { MEDIA_SCOPES } from "../constants/media.js";

const FILE_NAME_MAX_LENGTH = 255;
const MIME_TYPE_MAX_LENGTH = 100;

const mediaScopeSchema = z.enum(Object.values(MEDIA_SCOPES), {
    error: "Escopo de mídia inválido.",
});

const mediaTargetIdSchema = z.uuid({
    error: "Identificador do alvo inválido.",
});

export const signUploadSchema = z.object({
    scope: mediaScopeSchema,
    targetId: mediaTargetIdSchema,
    fileName: z
        .string({ error: "Informe o nome do arquivo." })
        .trim()
        .min(1, { error: "Informe o nome do arquivo." })
        .max(FILE_NAME_MAX_LENGTH, {
            error: `O nome do arquivo deve ter no máximo ${FILE_NAME_MAX_LENGTH} caracteres.`,
        }),
    mimeType: z
        .string({ error: "Informe o tipo do arquivo." })
        .trim()
        .toLowerCase()
        .min(1, { error: "Informe o tipo do arquivo." })
        .max(MIME_TYPE_MAX_LENGTH, { error: "Tipo de arquivo inválido." }),
    bytes: z
        .number({ error: "Informe o tamanho do arquivo em bytes." })
        .int({ error: "O tamanho do arquivo deve ser um número inteiro." })
        .positive({ error: "O tamanho do arquivo deve ser maior que zero." }),
    durationSeconds: z
        .number({ error: "A duração do vídeo deve ser um número." })
        .positive({ error: "A duração do vídeo deve ser maior que zero." })
        .optional(),
});

export const mediaParamsSchema = z.object({
    id: z.uuid({ error: "Identificador de mídia inválido." }),
});

export const mediaTargetQuerySchema = z.object({
    scope: mediaScopeSchema,
    targetId: mediaTargetIdSchema,
});
