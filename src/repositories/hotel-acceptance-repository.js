import { getPrisma } from "../lib/prisma.js";

const ACCEPTANCE_FIELDS = Object.freeze({
    id: true,
    customLabel: true,
    isAllowed: true,
    details: true,
    acceptanceType: { select: { code: true, name: true } },
});

export function createHotelAcceptanceRepository(getClient = getPrisma) {
    return Object.freeze({
        listTypes(client = getClient()) {
            return client.acceptanceType.findMany({
                select: { id: true, code: true },
            });
        },

        listByHotel(hotelId, client = getClient()) {
            return client.hotelAcceptance.findMany({
                where: { hotelId },
                select: ACCEPTANCE_FIELDS,
                orderBy: [
                    { acceptanceType: { code: "asc" } },
                    { customLabel: "asc" },
                ],
            });
        },

        async replaceAll(hotelId, rows, client = getClient()) {
            await client.hotelAcceptance.deleteMany({ where: { hotelId } });
            await client.hotelAcceptance.createMany({
                data: rows.map((row) => ({ hotelId, ...row })),
            });
        },
    });
}

export const hotelAcceptanceRepository = createHotelAcceptanceRepository();
