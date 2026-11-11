import { z } from "zod";
import {
    MANUAL_ROOM_STATUSES,
    ROOM_STATUSES,
} from "../../constants/room-statuses.js";
import {
    MAX_ADMINISTRATIVE_NOTES_LENGTH,
    MAX_PRICE_INTEGER_DIGITS,
    MAX_ROOM_FLOOR,
    MAX_ROOM_NUMBER_LENGTH,
    MIN_ROOM_FLOOR,
} from "../../constants/room.js";
import { createDecimalInputSchema } from "../room-types/room-type-form.js";

export { MAX_ROOM_FLOOR, MIN_ROOM_FLOOR };

export const ROOM_FORM_DEFAULT_VALUES = Object.freeze({
    roomTypeId: "",
    number: "",
    floor: 0,
    isAccessible: false,
    administrativeNotes: "",
    status: ROOM_STATUSES.AVAILABLE,
    usesTypePrice: true,
    price: "",
});

const roomPriceInputSchema = createDecimalInputSchema(
    "o preço do quarto",
    MAX_PRICE_INTEGER_DIGITS,
);

const operationFields = {
    administrativeNotes: z
        .string()
        .trim()
        .max(MAX_ADMINISTRATIVE_NOTES_LENGTH, {
            error: `As observações devem ter no máximo ${MAX_ADMINISTRATIVE_NOTES_LENGTH} caracteres.`,
        }),
    status: z.enum(MANUAL_ROOM_STATUSES, {
        error: "Selecione o status do quarto.",
    }),
    usesTypePrice: z.boolean(),
    price: z.string(),
};

const structureFields = {
    roomTypeId: z.string().min(1, { error: "Selecione o tipo de acomodação." }),
    number: z
        .string()
        .trim()
        .min(1, { error: "Informe o número do quarto." })
        .max(MAX_ROOM_NUMBER_LENGTH, {
            error: `O número do quarto deve ter no máximo ${MAX_ROOM_NUMBER_LENGTH} caracteres.`,
        }),
    floor: z
        .number({ error: "O andar deve ser um número inteiro." })
        .int({ error: "O andar deve ser um número inteiro." })
        .min(MIN_ROOM_FLOOR, {
            error: `O andar deve ser no mínimo ${MIN_ROOM_FLOOR}.`,
        })
        .max(MAX_ROOM_FLOOR, {
            error: `O andar deve ser no máximo ${MAX_ROOM_FLOOR}.`,
        }),
    isAccessible: z.boolean(),
};

function addPriceIssue(values, context) {
    if (values.usesTypePrice) {
        return;
    }
    const result = roomPriceInputSchema.safeParse(values.price);
    if (result.success) {
        return;
    }
    context.addIssue({
        code: "custom",
        message: result.error.issues[0].message,
        path: ["price"],
    });
}

export const roomFormSchema = z
    .object({ ...structureFields, ...operationFields })
    .superRefine(addPriceIssue);

export const roomOperationFormSchema = z
    .object(operationFields)
    .superRefine(addPriceIssue);

function toDecimalInput(value) {
    return String(value).replace(".", ",");
}

function isManualStatus(status) {
    return MANUAL_ROOM_STATUSES.includes(status);
}

export function toRoomFormValues(room) {
    return {
        roomTypeId: room.roomTypeId,
        number: room.number,
        floor: room.floor,
        isAccessible: room.isAccessible,
        administrativeNotes: room.administrativeNotes ?? "",
        status: isManualStatus(room.status) ? room.status : "",
        usesTypePrice: room.price === null,
        price: room.price === null ? "" : toDecimalInput(room.price),
    };
}

function toPriceValue(values) {
    if (values.usesTypePrice) {
        return null;
    }
    return roomPriceInputSchema.parse(values.price);
}

function toOperationPayload(values) {
    return {
        administrativeNotes: values.administrativeNotes,
        status: values.status,
        price: toPriceValue(values),
    };
}

function toStructurePayload(values) {
    return {
        roomTypeId: values.roomTypeId,
        number: values.number,
        floor: values.floor,
        isAccessible: values.isAccessible,
    };
}

export function toCreateRoomPayload(values) {
    const payload = {
        ...toStructurePayload(values),
        ...toOperationPayload(values),
    };
    if (payload.price === null) {
        delete payload.price;
    }
    return payload;
}

export function toUpdateRoomPayload(values, currentRoomTypeId) {
    const payload = {
        ...toStructurePayload(values),
        ...toOperationPayload(values),
    };
    if (payload.roomTypeId === currentRoomTypeId) {
        delete payload.roomTypeId;
    }
    return payload;
}

export function toRoomOperationPayload(values) {
    return toOperationPayload(values);
}

export function buildRoomTypeOptions(roomTypes, currentRoomTypeId) {
    return roomTypes
        .filter(
            (roomType) =>
                roomType.isActive || roomType.id === currentRoomTypeId,
        )
        .map((roomType) => ({
            value: roomType.id,
            label: roomType.isActive
                ? roomType.name
                : `${roomType.name} (inativo)`,
        }));
}
