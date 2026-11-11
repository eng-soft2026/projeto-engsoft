import { USER_ROLES } from "../../../../../../constants/user-roles.js";
import { requirePageRole } from "../../../../../../modules/auth/guards.js";
import { isHotelEditable } from "../../../../../../modules/hotels/hotel-editability.js";
import {
    ManagedUnitList,
    NewUnitLink,
} from "../../../../../../modules/units/components/managed-unit-list.jsx";
import { paginationQuerySchema } from "../../../../../../schemas/pagination.js";
import { unitService } from "../../../../../../services/unit-service.js";
import { loadManagedHotel } from "../load-managed-hotel.js";

export const metadata = { title: "Unidades do hotel | Reserva de Hotéis" };

function readPagination(query) {
    const result = paginationQuerySchema.safeParse({ page: query.page });
    if (!result.success) {
        return paginationQuerySchema.parse({});
    }
    return result.data;
}

export default async function HotelUnitsPage({ params, searchParams }) {
    const { id } = await params;
    const hotel = await loadManagedHotel(id);
    const manager = await requirePageRole([USER_ROLES.MANAGER]);
    const pagination = readPagination(await searchParams);
    const result = await unitService.listUnits(manager, hotel.id, pagination);
    const isEditable = isHotelEditable(hotel.status);

    return (
        <div className="flex max-w-3xl flex-col gap-4">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                    <h2 className="text-foreground text-lg font-semibold">
                        Unidades
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Endereços onde o hotel recebe hóspedes.
                    </p>
                </div>
                {isEditable && result.total > 0 && (
                    <NewUnitLink hotelId={hotel.id} />
                )}
            </header>
            <ManagedUnitList
                hotelId={hotel.id}
                items={result.items}
                page={pagination.page}
                pageSize={pagination.pageSize}
                total={result.total}
                isEditable={isEditable}
            />
        </div>
    );
}
