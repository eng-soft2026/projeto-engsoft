export function buildRoomType(overrides = {}) {
    return {
        name: "Standard",
        description: "Quarto padrão.",
        maxGuests: 2,
        areaM2: "20.50",
        defaultPrice: "250.00",
        beds: [{ bedType: "DOUBLE", quantity: 1 }],
        ...overrides,
    };
}
