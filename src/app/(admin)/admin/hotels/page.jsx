import { USER_ROLES } from "../../../../constants/user-roles.js";
import { requirePageRole } from "../../../../modules/auth/guards.js";
import { readAdminHotelsQuery } from "../../../../modules/hotels/admin-hotel-filters.js";
import {
    AdminHotelList,
    AdminHotelStatusFilter,
} from "../../../../modules/hotels/components/admin-hotel-list.jsx";
import { hotelService } from "../../../../services/hotel-service.js";

export const metadata = { title: "Hotéis | Reserva de Hotéis" };

export default async function AdminHotelsPage({ searchParams }) {
    const admin = await requirePageRole([USER_ROLES.ADMIN]);
    const { filter, status, page, pageSize } = readAdminHotelsQuery(
        await searchParams,
    );
    const result = await hotelService.listHotelsForReview(admin, {
        status,
        page,
        pageSize,
    });

    return (
        <>
            <header className="flex flex-col gap-1">
                <h1 className="text-foreground text-2xl font-semibold">
                    Hotéis
                </h1>
                <p className="text-muted-foreground text-sm">
                    Hotéis em análise aguardam sua aprovação. Filtre por status
                    para ver os publicados, bloqueados e rascunhos.
                </p>
            </header>
            <AdminHotelStatusFilter filter={filter} />
            <AdminHotelList
                items={result.items}
                filter={filter}
                page={page}
                pageSize={pageSize}
                total={result.total}
            />
        </>
    );
}
