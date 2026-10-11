export const ACCEPTANCE_TYPE_CODES = Object.freeze({
    PETS: "PETS",
    SMOKING: "SMOKING",
    CHILDREN: "CHILDREN",
    VISITORS: "VISITORS",
    EVENTS: "EVENTS",
    OTHER: "OTHER",
});

export const SYSTEM_ACCEPTANCE_TYPES = Object.freeze([
    Object.freeze({
        code: ACCEPTANCE_TYPE_CODES.PETS,
        name: "Animais de estimação",
        description: "Indica se o hotel aceita animais de estimação.",
    }),
    Object.freeze({
        code: ACCEPTANCE_TYPE_CODES.SMOKING,
        name: "Fumar",
        description: "Indica se é permitido fumar nas dependências do hotel.",
    }),
    Object.freeze({
        code: ACCEPTANCE_TYPE_CODES.CHILDREN,
        name: "Crianças",
        description: "Indica se o hotel aceita crianças como hóspedes.",
    }),
    Object.freeze({
        code: ACCEPTANCE_TYPE_CODES.VISITORS,
        name: "Visitantes",
        description: "Indica se os hóspedes podem receber visitantes.",
    }),
    Object.freeze({
        code: ACCEPTANCE_TYPE_CODES.EVENTS,
        name: "Eventos",
        description: "Indica se são permitidos eventos e festas.",
    }),
    Object.freeze({
        code: ACCEPTANCE_TYPE_CODES.OTHER,
        name: "Outras regras",
        description: "Regra específica criada pelo gestor do hotel.",
    }),
]);
