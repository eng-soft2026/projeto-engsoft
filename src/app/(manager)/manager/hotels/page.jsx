import { USER_ROLES } from "../../../../constants/user-roles.js";
import { requirePageRole } from "../../../../modules/auth/guards.js";
import {
    ManagedHotelList,
    NewHotelLink,
} from "../../../../modules/hotels/components/managed-hotel-list.jsx";
import { paginationQuerySchema } from "../../../../schemas/pagination.js";
import { hotelService } from "../../../../services/hotel-service.js";

export const metadata = { title: "Meus hotéis | Reserva de Hotéis" };

function readPagination(query) {
    const result = paginationQuerySchema.safeParse({ page: query.page });
    if (!result.success) {
        return paginationQuerySchema.parse({});
    }
    return result.data;
}

export default async function ManagedHotelsPage({ searchParams }) {
    const manager = await requirePageRole([USER_ROLES.MANAGER]);
    const pagination = readPagination(await searchParams);
    const result = await hotelService.listManagedHotels(manager, pagination);

    return (
        <>
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                    <h1 className="text-foreground text-2xl font-semibold">
                        Meus hotéis
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Hotéis que você cadastrou ou ajuda a gerir.
                    </p>
                </div>
                {result.total > 0 && <NewHotelLink />}
            </header>
            <ManagedHotelList
                items={result.items}
                page={pagination.page}
                pageSize={pagination.pageSize}
                total={result.total}
            />
        </>
    );
}
