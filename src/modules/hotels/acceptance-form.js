import { z } from "zod";
import {
    ACCEPTANCE_TYPE_CODES,
    SYSTEM_ACCEPTANCE_TYPES,
} from "../../constants/acceptance-types.js";
import {
    MAX_ACCEPTANCES,
    customLabelSchema,
    detailsSchema,
} from "../../schemas/acceptance-schemas.js";

export const ACCEPTANCE_STATUSES = Object.freeze({
    UNSET: "",
    ALLOWED: "ALLOWED",
    NOT_ALLOWED: "NOT_ALLOWED",
});

export const STANDARD_ACCEPTANCE_TYPES = Object.freeze(
    SYSTEM_ACCEPTANCE_TYPES.filter(
        ({ code }) => code !== ACCEPTANCE_TYPE_CODES.OTHER,
    ),
);

export const MAX_CUSTOM_ACCEPTANCES =
    MAX_ACCEPTANCES - STANDARD_ACCEPTANCE_TYPES.length;

const DUPLICATE_LABEL_MESSAGE = "Já existe uma regra com este rótulo.";

const allowedStatusSchema = z.enum(
    [ACCEPTANCE_STATUSES.ALLOWED, ACCEPTANCE_STATUSES.NOT_ALLOWED],
    { error: "Informe se a regra é permitida." },
);

const standardAcceptanceSchema = z.object({
    type: z.enum(
        STANDARD_ACCEPTANCE_TYPES.map(({ code }) => code),
        { error: "Tipo de regra de aceitação inválido." },
    ),
    status: z.union([
        z.literal(ACCEPTANCE_STATUSES.UNSET),
        allowedStatusSchema,
    ]),
    details: detailsSchema.nullish(),
});

const customAcceptanceSchema = z.object({
    customLabel: customLabelSchema,
    status: allowedStatusSchema,
    details: detailsSchema.nullish(),
});

function findDuplicateLabelIndexes(customAcceptances) {
    const seenLabels = new Set();
    const duplicateIndexes = [];
    customAcceptances.forEach(({ customLabel }, index) => {
        const key = customLabel.toLowerCase();
        if (seenLabels.has(key)) {
            duplicateIndexes.push(index);
            return;
        }
        seenLabels.add(key);
    });
    return duplicateIndexes;
}

export const acceptanceFormSchema = z
    .object({
        standard: z.array(standardAcceptanceSchema),
        custom: z.array(customAcceptanceSchema).max(MAX_CUSTOM_ACCEPTANCES, {
            error: `Informe no máximo ${MAX_CUSTOM_ACCEPTANCES} regras próprias.`,
        }),
    })
    .superRefine(({ custom }, context) => {
        for (const index of findDuplicateLabelIndexes(custom)) {
            context.addIssue({
                code: "custom",
                message: DUPLICATE_LABEL_MESSAGE,
                path: ["custom", index, "customLabel"],
            });
        }
    });

function toStatus(isAllowed) {
    return isAllowed
        ? ACCEPTANCE_STATUSES.ALLOWED
        : ACCEPTANCE_STATUSES.NOT_ALLOWED;
}

export function buildEmptyCustomAcceptance() {
    return {
        customLabel: "",
        status: ACCEPTANCE_STATUSES.ALLOWED,
        details: "",
    };
}

export function buildAcceptanceFormValues(acceptances) {
    const standard = STANDARD_ACCEPTANCE_TYPES.map(({ code }) => {
        const acceptance = acceptances.find(({ type }) => type === code);
        if (!acceptance) {
            return {
                type: code,
                status: ACCEPTANCE_STATUSES.UNSET,
                details: "",
            };
        }
        return {
            type: code,
            status: toStatus(acceptance.isAllowed),
            details: acceptance.details ?? "",
        };
    });
    const custom = acceptances
        .filter(({ type }) => type === ACCEPTANCE_TYPE_CODES.OTHER)
        .map(({ customLabel, isAllowed, details }) => ({
            customLabel,
            status: toStatus(isAllowed),
            details: details ?? "",
        }));
    return { standard, custom };
}

export function buildAcceptancesPayload({ standard, custom }) {
    const standardAcceptances = standard
        .filter(({ status }) => status !== ACCEPTANCE_STATUSES.UNSET)
        .map(({ type, status, details }) => ({
            type,
            customLabel: null,
            isAllowed: status === ACCEPTANCE_STATUSES.ALLOWED,
            details: details || null,
        }));
    const customAcceptances = custom.map(
        ({ customLabel, status, details }) => ({
            type: ACCEPTANCE_TYPE_CODES.OTHER,
            customLabel,
            isAllowed: status === ACCEPTANCE_STATUSES.ALLOWED,
            details: details || null,
        }),
    );
    return { acceptances: [...standardAcceptances, ...customAcceptances] };
}
