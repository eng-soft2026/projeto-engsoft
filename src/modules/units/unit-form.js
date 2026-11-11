import { z } from "zod";
import {
    BRAZILIAN_STATES,
    MAX_UNIT_PHONES,
    MIN_UNIT_OVERBOOKING_PERCENT,
    MIN_UNIT_PHONES,
} from "../../constants/unit.js";
import {
    createUnitSchema,
    overbookingPercentageSchema,
    phoneSchema,
} from "../../schemas/unit-schemas.js";
import { formatPhone } from "../../utils/brazilian-phone.js";
import { formatZipCode } from "../../utils/zip-code.js";

export { MAX_UNIT_PHONES, MIN_UNIT_PHONES };

export const STATE_OPTIONS = Object.freeze(
    BRAZILIAN_STATES.map((state) =>
        Object.freeze({ value: state, label: state }),
    ),
);

export const EMPTY_PHONE = Object.freeze({ value: "" });

export const UNIT_FORM_DEFAULT_VALUES = Object.freeze({
    name: "",
    email: "",
    checkInTime: "",
    checkOutTime: "",
    overbookingPercentage: MIN_UNIT_OVERBOOKING_PERCENT,
    address: Object.freeze({
        zipCode: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
    }),
    phones: Object.freeze([EMPTY_PHONE]),
});

function addDuplicatePhoneIssues(entries, context) {
    const seenPhones = new Set();
    entries.forEach(({ value }, index) => {
        if (!seenPhones.has(value)) {
            seenPhones.add(value);
            return;
        }
        context.addIssue({
            code: "custom",
            message: "Telefone repetido.",
            path: [index, "value"],
        });
    });
}

const phoneEntriesSchema = z
    .array(z.object({ value: phoneSchema }), {
        error: "Envie a lista de telefones.",
    })
    .min(MIN_UNIT_PHONES, {
        error: `Informe ao menos ${MIN_UNIT_PHONES} telefone.`,
    })
    .max(MAX_UNIT_PHONES, {
        error: `Informe no máximo ${MAX_UNIT_PHONES} telefones.`,
    })
    .superRefine(addDuplicatePhoneIssues);

export const unitFormSchema = createUnitSchema.extend({
    overbookingPercentage: overbookingPercentageSchema,
    phones: phoneEntriesSchema,
});

export function toUnitFormValues(unit) {
    const { address } = unit;
    return {
        name: unit.name,
        email: unit.email,
        checkInTime: unit.checkInTime,
        checkOutTime: unit.checkOutTime,
        overbookingPercentage: unit.overbookingPercentage,
        address: {
            zipCode: formatZipCode(address.zipCode),
            street: address.street,
            number: address.number,
            complement: address.complement ?? "",
            neighborhood: address.neighborhood,
            city: address.city,
            state: address.state,
        },
        phones: unit.phones.map(({ phone }) => ({ value: formatPhone(phone) })),
    };
}

export function toUnitPayload(values) {
    return {
        name: values.name,
        email: values.email,
        checkInTime: values.checkInTime,
        checkOutTime: values.checkOutTime,
        overbookingPercentage: values.overbookingPercentage,
        address: values.address,
        phones: values.phones.map(({ value }) => value),
    };
}
