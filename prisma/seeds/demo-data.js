import { BED_TYPES } from "../../src/constants/bed-types.js";
import { USER_ROLES } from "../../src/constants/user-roles.js";

export const DEMO_PASSWORD_ENV_KEYS = Object.freeze({
    [USER_ROLES.MANAGER]: "DEMO_MANAGER_PASSWORD",
    [USER_ROLES.CUSTOMER]: "DEMO_CUSTOMER_PASSWORD",
});

export const DEMO_USERS = Object.freeze([
    Object.freeze({
        name: "Gestor Demonstração",
        email: "gestor.demo@example.com",
        cpf: "71460238001",
        role: USER_ROLES.MANAGER,
    }),
    Object.freeze({
        name: "Cliente Demonstração",
        email: "cliente.demo@example.com",
        cpf: "28625587020",
        role: USER_ROLES.CUSTOMER,
    }),
]);

export const DEMO_OWNER_EMAIL = "gestor.demo@example.com";

export const DEMO_HOTELS = Object.freeze([
    {
        id: "d0000000-0000-4000-8000-000000000101",
        input: {
            name: "Hotel Demo Paulista",
            description:
                "Hotel fictício de demonstração a poucos passos da Avenida Paulista, com quartos para viagens a trabalho e lazer.",
            category: "Executivo",
            cnpj: "12345678000195",
            email: "contato.paulista@example.com",
        },
        amenityNames: ["Wi-Fi", "Café da manhã", "Recepção 24 horas"],
        unit: {
            id: "d0000000-0000-4000-8000-000000000201",
            phoneIds: ["d0000000-0000-4000-8000-000000000301"],
            input: {
                name: "Unidade Paulista",
                email: "paulista.unidade@example.com",
                checkInTime: "14:00",
                checkOutTime: "12:00",
                overbookingPercentage: 5,
                address: {
                    zipCode: "01310-100",
                    street: "Avenida Paulista",
                    number: "1000",
                    complement: null,
                    neighborhood: "Bela Vista",
                    city: "São Paulo",
                    state: "SP",
                },
                phones: ["(11) 3000-1000"],
            },
            coordinates: { latitude: "-23.564400", longitude: "-46.652700" },
            amenityNames: ["Estacionamento", "Academia", "Elevador"],
        },
        roomTypes: [
            {
                id: "d0000000-0000-4000-8000-000000000401",
                input: {
                    name: "Standard Casal",
                    description: "Quarto confortável com cama de casal.",
                    maxGuests: 2,
                    areaM2: "18.50",
                    defaultPrice: "320.00",
                    beds: [{ bedType: BED_TYPES.DOUBLE, quantity: 1 }],
                },
                amenityNames: ["Ar-condicionado", "TV"],
            },
            {
                id: "d0000000-0000-4000-8000-000000000402",
                input: {
                    name: "Luxo Família",
                    description:
                        "Quarto amplo com cama queen e duas camas de solteiro.",
                    maxGuests: 4,
                    areaM2: "32.00",
                    defaultPrice: "540.00",
                    beds: [
                        { bedType: BED_TYPES.QUEEN, quantity: 1 },
                        { bedType: BED_TYPES.SINGLE, quantity: 2 },
                    ],
                },
                amenityNames: ["Ar-condicionado", "TV", "Frigobar", "Cofre"],
            },
        ],
        rooms: [
            {
                id: "d0000000-0000-4000-8000-000000000501",
                roomTypeId: "d0000000-0000-4000-8000-000000000401",
                input: { number: "101", floor: 1, isAccessible: true },
            },
            {
                id: "d0000000-0000-4000-8000-000000000502",
                roomTypeId: "d0000000-0000-4000-8000-000000000401",
                input: { number: "102", floor: 1 },
            },
            {
                id: "d0000000-0000-4000-8000-000000000503",
                roomTypeId: "d0000000-0000-4000-8000-000000000402",
                input: { number: "201", floor: 2 },
            },
            {
                id: "d0000000-0000-4000-8000-000000000504",
                roomTypeId: "d0000000-0000-4000-8000-000000000402",
                priceHistoryId: "d0000000-0000-4000-8000-000000000601",
                input: { number: "202", floor: 2, price: "590.00" },
            },
        ],
    },
    {
        id: "d0000000-0000-4000-8000-000000000102",
        input: {
            name: "Pousada Demo Copacabana",
            description:
                "Pousada fictícia de demonstração perto da praia de Copacabana, ideal para férias em família.",
            category: "Pousada",
            cnpj: "98765432000198",
            email: "contato.copacabana@example.com",
        },
        amenityNames: ["Wi-Fi", "Piscina", "Aceita pets"],
        unit: {
            id: "d0000000-0000-4000-8000-000000000202",
            phoneIds: ["d0000000-0000-4000-8000-000000000302"],
            input: {
                name: "Unidade Copacabana",
                email: "copacabana.unidade@example.com",
                checkInTime: "15:00",
                checkOutTime: "11:00",
                overbookingPercentage: 0,
                address: {
                    zipCode: "22070-011",
                    street: "Avenida Atlântica",
                    number: "2000",
                    complement: "Bloco B",
                    neighborhood: "Copacabana",
                    city: "Rio de Janeiro",
                    state: "RJ",
                },
                phones: ["(21) 98000-2000"],
            },
            coordinates: { latitude: "-22.971200", longitude: "-43.182300" },
            amenityNames: ["Bar", "Restaurante", "Lavanderia"],
        },
        roomTypes: [
            {
                id: "d0000000-0000-4000-8000-000000000403",
                input: {
                    name: "Solteiro Econômico",
                    description: "Quarto compacto com uma cama de solteiro.",
                    maxGuests: 1,
                    areaM2: "12.00",
                    defaultPrice: "180.00",
                    beds: [{ bedType: BED_TYPES.SINGLE, quantity: 1 }],
                },
                amenityNames: ["TV"],
            },
            {
                id: "d0000000-0000-4000-8000-000000000404",
                input: {
                    name: "Suíte Vista Mar",
                    description:
                        "Suíte com cama king e varanda voltada ao mar.",
                    maxGuests: 3,
                    areaM2: "40.00",
                    defaultPrice: "890.00",
                    beds: [
                        { bedType: BED_TYPES.KING, quantity: 1 },
                        { bedType: BED_TYPES.SOFA_BED, quantity: 1 },
                    ],
                },
                amenityNames: ["Ar-condicionado", "Varanda", "Frigobar"],
            },
        ],
        rooms: [
            {
                id: "d0000000-0000-4000-8000-000000000505",
                roomTypeId: "d0000000-0000-4000-8000-000000000403",
                input: { number: "11", floor: 1 },
            },
            {
                id: "d0000000-0000-4000-8000-000000000506",
                roomTypeId: "d0000000-0000-4000-8000-000000000403",
                input: { number: "12", floor: 1, isAccessible: true },
            },
            {
                id: "d0000000-0000-4000-8000-000000000507",
                roomTypeId: "d0000000-0000-4000-8000-000000000404",
                input: { number: "31", floor: 3 },
            },
            {
                id: "d0000000-0000-4000-8000-000000000508",
                roomTypeId: "d0000000-0000-4000-8000-000000000404",
                priceHistoryId: "d0000000-0000-4000-8000-000000000602",
                input: { number: "32", floor: 3, price: "950.00" },
            },
        ],
    },
]);
