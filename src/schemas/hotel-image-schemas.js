import { z } from "zod";
import { MAX_HOTEL_IMAGES } from "../constants/media.js";

function hasAnyChange(data) {
    return Object.values(data).some((value) => value !== undefined);
}

const isCoverSchema = z.boolean({ error: "Informe se a foto é a capa." });

export const createHotelImageSchema = z.object(
    {
        assetId: z.uuid({ error: "Identificador de mídia inválido." }),
        isCover: isCoverSchema.optional(),
    },
    { error: "Envie os dados da foto." },
);

export const updateHotelImageSchema = z
    .object(
        {
            position: z
                .int({ error: "Informe uma posição válida." })
                .min(0, { error: "Informe uma posição válida." })
                .max(MAX_HOTEL_IMAGES - 1, {
                    error: "Informe uma posição válida.",
                })
                .optional(),
            isCover: z
                .literal(true, {
                    error: "Para trocar a capa, defina outra foto como capa.",
                })
                .optional(),
        },
        { error: "Envie os dados da foto." },
    )
    .refine(hasAnyChange, {
        error: "Informe ao menos um campo para atualizar.",
    });

export const hotelImageParamsSchema = z.object(
    {
        id: z.uuid({ error: "Identificador de hotel inválido." }),
        imageId: z.uuid({ error: "Identificador de foto inválido." }),
    },
    { error: "Identificador de foto inválido." },
);
