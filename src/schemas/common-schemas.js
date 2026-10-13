import { z } from "zod";

const EMAIL_MAX_LENGTH = 254;

export const emailSchema = z
    .string({ error: "Informe o e-mail." })
    .trim()
    .toLowerCase()
    .pipe(
        z.email({ error: "Informe um e-mail válido." }).max(EMAIL_MAX_LENGTH, {
            error: `O e-mail deve ter no máximo ${EMAIL_MAX_LENGTH} caracteres.`,
        }),
    );
