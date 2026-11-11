import { USER_ROLES } from "../../../../../../constants/user-roles.js";
import { requirePageRole } from "../../../../../../modules/auth/guards.js";
import { isHotelEditable } from "../../../../../../modules/hotels/hotel-editability.js";
import {
    ManagedRoomTypeList,
    NewRoomTypeLink,
} from "../../../../../../modules/room-types/components/managed-room-type-list.jsx";
import { paginationQuerySchema } from "../../../../../../schemas/pagination.js";
import { roomTypeService } from "../../../../../../services/room-type-service.js";
import { loadManagedHotel } from "../load-managed-hotel.js";

export const metadata = {
    title: "Tipos de acomodação | Reserva de Hotéis",
};

function readPagination(query) {
    const result = paginationQuerySchema.safeParse({ page: query.page });
    if (!result.success) {
        return paginationQuerySchema.parse({});
    }
    return result.data;
}

export default async function HotelRoomTypesPage({ params, searchParams }) {
    const { id } = await params;
    const hotel = await loadManagedHotel(id);
    const manager = await requirePageRole([USER_ROLES.MANAGER]);
    const pagination = readPagination(await searchParams);
    const result = await roomTypeService.listRoomTypes(
        manager,
        hotel.id,
        pagination,
    );
    const isEditable = isHotelEditable(hotel.status);

    return (
        <div className="flex max-w-3xl flex-col gap-4">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                    <h2 className="text-foreground text-lg font-semibold">
                        Tipos de acomodação
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Modelos de quarto compartilhados pelas unidades do
                        hotel.
                    </p>
                </div>
                {isEditable && result.total > 0 && (
                    <NewRoomTypeLink hotelId={hotel.id} />
                )}
            </header>
            <ManagedRoomTypeList
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
