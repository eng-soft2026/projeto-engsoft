import { z } from "zod";
import { MAX_HOTEL_IMAGES } from "../constants/media.js";

const INVALID_POSITION_MESSAGE = "Informe uma posição válida.";

function hasAnyChange(data) {
    return Object.values(data).some((value) => value !== undefined);
}

const isCoverSchema = z.boolean({ error: "Informe se a foto é a capa." });

function buildPositionSchema(maxImages) {
    const schema = z
        .int({ error: INVALID_POSITION_MESSAGE })
        .min(0, { error: INVALID_POSITION_MESSAGE });
    if (maxImages === null) {
        return schema;
    }
    return schema.max(maxImages - 1, { error: INVALID_POSITION_MESSAGE });
}

function buildUpdateImageSchema(maxImages) {
    return z
        .object(
            {
                position: buildPositionSchema(maxImages).optional(),
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
}

function buildImageParamsSchema(ownerMessage) {
    return z.object(
        {
            id: z.uuid({ error: ownerMessage }),
            imageId: z.uuid({ error: "Identificador de foto inválido." }),
        },
        { error: "Identificador de foto inválido." },
    );
}

export const createImageSchema = z.object(
    {
        assetId: z.uuid({ error: "Identificador de mídia inválido." }),
        isCover: isCoverSchema.optional(),
    },
    { error: "Envie os dados da foto." },
);

export const createHotelImageSchema = createImageSchema;

export const createUnitImageSchema = createImageSchema;

export const updateHotelImageSchema = buildUpdateImageSchema(MAX_HOTEL_IMAGES);

export const updateUnitImageSchema = buildUpdateImageSchema(null);

export const hotelImageParamsSchema = buildImageParamsSchema(
    "Identificador de hotel inválido.",
);

export const unitImageParamsSchema = buildImageParamsSchema(
    "Identificador de unidade inválido.",
);
