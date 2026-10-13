import { z } from "zod";
import { MAX_AMENITIES_PER_TARGET } from "../constants/amenity.js";

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;

export const createAmenitySchema = z.object(
    {
        name: z
            .string({ error: "Informe o nome da comodidade." })
            .trim()
            .min(NAME_MIN_LENGTH, {
                error: `O nome deve ter pelo menos ${NAME_MIN_LENGTH} caracteres.`,
            })
            .max(NAME_MAX_LENGTH, {
                error: `O nome deve ter no máximo ${NAME_MAX_LENGTH} caracteres.`,
            }),
    },
    { error: "Envie os dados da comodidade." },
);

export const replaceAmenitiesSchema = z.object(
    {
        amenityIds: z
            .array(z.uuid({ error: "Identificador de comodidade inválido." }), {
                error: "Envie a lista de comodidades.",
            })
            .max(MAX_AMENITIES_PER_TARGET, {
                error: `Informe no máximo ${MAX_AMENITIES_PER_TARGET} comodidades.`,
            })
            .transform((amenityIds) => [...new Set(amenityIds)]),
    },
    { error: "Envie a lista de comodidades." },
);
