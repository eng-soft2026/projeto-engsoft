import { randomUUID } from "node:crypto";

export const VALID_CNPJ = "11222333000181";

export function buildHotel(overrides = {}) {
    const tag = randomUUID().slice(0, 8);
    return {
        name: `Hotel ${tag}`,
        description: "Hotel criado pelos testes.",
        category: "HOTEL",
        cnpj: VALID_CNPJ,
        email: `hotel-${tag}@example.com`,
        ...overrides,
    };
}
