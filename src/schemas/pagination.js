import { z } from "zod";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../constants/pagination.js";

const MIN_PAGE = 1;
const MIN_PAGE_SIZE = 1;

export const paginationQuerySchema = z
    .object(
        {
            page: z
                .union([z.string(), z.number()], {
                    error: "Informe um número inteiro válido para a página.",
                })
                .pipe(
                    z.coerce
                        .number({
                            error: "Informe um número inteiro válido para a página.",
                        })
                        .int({ error: "A página deve ser um número inteiro." })
                        .min(MIN_PAGE, {
                            error: `A página deve ser no mínimo ${MIN_PAGE}.`,
                        }),
                )
                .default(MIN_PAGE),
            pageSize: z
                .union([z.string(), z.number()], {
                    error: "Informe um número inteiro válido para o tamanho da página.",
                })
                .pipe(
                    z.coerce
                        .number({
                            error: "Informe um número inteiro válido para o tamanho da página.",
                        })
                        .int({
                            error: "O tamanho da página deve ser um número inteiro.",
                        })
                        .min(MIN_PAGE_SIZE, {
                            error: `O tamanho da página deve ser no mínimo ${MIN_PAGE_SIZE}.`,
                        })
                        .max(MAX_PAGE_SIZE, {
                            error: `O tamanho da página deve ser no máximo ${MAX_PAGE_SIZE}.`,
                        }),
                )
                .default(DEFAULT_PAGE_SIZE),
        },
        { error: "Parâmetros de paginação inválidos." },
    )
    .refine(
        ({ page, pageSize }) =>
            Number.isSafeInteger((page - MIN_PAGE) * pageSize),
        {
            error: "O deslocamento da página excede o limite seguro.",
            path: ["page"],
        },
    );
