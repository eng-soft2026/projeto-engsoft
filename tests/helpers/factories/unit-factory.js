const DEFAULT_ADDRESS = Object.freeze({
    zipCode: "01001-000",
    street: "Praça da Sé",
    number: "100",
    neighborhood: "Sé",
    city: "São Paulo",
    state: "SP",
});

export function buildUnit({ address, ...overrides } = {}) {
    return {
        name: "Unidade Centro",
        email: "centro@example.com",
        checkInTime: "14:00",
        checkOutTime: "12:00",
        overbookingPercentage: 5,
        phones: ["(11) 3333-4444"],
        ...overrides,
        address: { ...DEFAULT_ADDRESS, ...address },
    };
}
