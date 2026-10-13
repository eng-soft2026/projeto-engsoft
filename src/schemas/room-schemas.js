import { z } from "zod";
import {
    MANUAL_ROOM_STATUSES,
    ROOM_STATUSES,
} from "../constants/room-statuses.js";
import {
    MAX_ADMINISTRATIVE_NOTES_LENGTH,
    MAX_ROOM_FLOOR,
    MAX_ROOM_NUMBER_LENGTH,
    MIN_ROOM_FLOOR,
} from "../constants/room.js";
import { priceSchema } from "./room-type-schemas.js";

function hasAnyChange(data) {
    return Object.values(data).some((value) => value !== undefined);
}

const roomTypeIdSchema = z.uuid({
    error: "Identificador de tipo de acomodação inválido.",
});

const numberSchema = z
    .string({ error: "Informe o número do quarto." })
    .trim()
    .min(1, { error: "Informe o número do quarto." })
    .max(MAX_ROOM_NUMBER_LENGTH, {
        error: `O número do quarto deve ter no máximo ${MAX_ROOM_NUMBER_LENGTH} caracteres.`,
    });

const floorSchema = z
    .number({ error: "O andar deve ser um número inteiro." })
    .int({ error: "O andar deve ser um número inteiro." })
    .min(MIN_ROOM_FLOOR, {
        error: `O andar deve ser no mínimo ${MIN_ROOM_FLOOR}.`,
    })
    .max(MAX_ROOM_FLOOR, {
        error: `O andar deve ser no máximo ${MAX_ROOM_FLOOR}.`,
    });

const accessibleSchema = z.boolean({
    error: "Informe se o quarto é acessível.",
});

const statusSchema = z.enum(MANUAL_ROOM_STATUSES, {
    error: "Status inválido. Use AVAILABLE, UNAVAILABLE ou MAINTENANCE.",
});

const notesSchema = z
    .string({ error: "Observações inválidas." })
    .trim()
    .max(MAX_ADMINISTRATIVE_NOTES_LENGTH, {
        error: `As observações devem ter no máximo ${MAX_ADMINISTRATIVE_NOTES_LENGTH} caracteres.`,
    })
    .transform((value) => (value === "" ? null : value));

export const createRoomSchema = z.object(
    {
        roomTypeId: roomTypeIdSchema,
        number: numberSchema,
        floor: floorSchema,
        isAccessible: accessibleSchema.default(false),
        administrativeNotes: notesSchema.nullish(),
        status: statusSchema.default(ROOM_STATUSES.AVAILABLE),
        price: priceSchema.optional(),
    },
    { error: "Envie os dados do quarto." },
);

export const updateRoomSchema = z
    .object(
        {
            roomTypeId: roomTypeIdSchema.optional(),
            number: numberSchema.optional(),
            floor: floorSchema.optional(),
            isAccessible: accessibleSchema.optional(),
            administrativeNotes: notesSchema.nullable().optional(),
            status: statusSchema.optional(),
            price: priceSchema.nullable().optional(),
            isActive: z
                .literal(false, {
                    error: "Um quarto desativado não pode ser reativado.",
                })
                .optional(),
        },
        { error: "Envie os dados do quarto." },
    )
    .refine(hasAnyChange, {
        error: "Informe ao menos um campo para atualizar.",
    })
    .refine(
        (data) => data.isActive === undefined || data.status === undefined,
        { error: "Não envie o status ao desativar o quarto." },
    );

export const roomParamsSchema = z.object(
    { id: z.uuid({ error: "Identificador de quarto inválido." }) },
    { error: "Identificador de quarto inválido." },
);
