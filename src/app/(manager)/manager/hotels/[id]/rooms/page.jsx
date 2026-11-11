import Link from "next/link";
import { Building2 } from "lucide-react";
import { EmptyState } from "../../../../../../components/ui/empty-state.jsx";
import { MAX_PAGE_SIZE } from "../../../../../../constants/pagination.js";
import { USER_ROLES } from "../../../../../../constants/user-roles.js";
import { requirePageRole } from "../../../../../../modules/auth/guards.js";
import { isHotelEditable } from "../../../../../../modules/hotels/hotel-editability.js";
import { buildManagedHotelHref } from "../../../../../../modules/hotels/managed-hotel-routes.js";
import {
    ManagedRoomList,
    NewRoomLink,
    UnitSelector,
} from "../../../../../../modules/rooms/components/managed-room-list.jsx";
import { paginationQuerySchema } from "../../../../../../schemas/pagination.js";
import { roomService } from "../../../../../../services/room-service.js";
import { unitService } from "../../../../../../services/unit-service.js";
import { loadManagedHotel } from "../load-managed-hotel.js";

export const metadata = { title: "Quartos | Reserva de Hotéis" };

const ALL_UNITS_PAGE = Object.freeze({ page: 1, pageSize: MAX_PAGE_SIZE });

function readPagination(query) {
    const result = paginationQuerySchema.safeParse({ page: query.page });
    if (!result.success) {
        return paginationQuerySchema.parse({});
    }
    return result.data;
}

function selectUnit(units, unitId) {
    return units.find((unit) => unit.id === unitId) ?? units[0];
}

function NoUnitsState({ hotelId }) {
    return (
        <EmptyState
            icon={Building2}
            title="Nenhuma unidade cadastrada"
            description="Os quartos pertencem a uma unidade. Cadastre uma unidade antes de criar quartos."
            action={
                <Link
                    href={buildManagedHotelHref(hotelId, "units")}
                    className="text-primary text-sm font-medium hover:underline"
                >
                    Ir para unidades
                </Link>
            }
        />
    );
}

export default async function HotelRoomsPage({ params, searchParams }) {
    const { id } = await params;
    const hotel = await loadManagedHotel(id);
    const manager = await requirePageRole([USER_ROLES.MANAGER]);
    const query = await searchParams;
    const { items: units } = await unitService.listUnits(
        manager,
        hotel.id,
        ALL_UNITS_PAGE,
    );
    const unit = selectUnit(units, query.unit);
    const pagination = readPagination(query);
    const rooms = unit
        ? await roomService.listRooms(manager, unit.id, pagination)
        : null;
    const canCreate = Boolean(unit?.isActive) && isHotelEditable(hotel.status);

    return (
        <div className="flex max-w-3xl flex-col gap-4">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                    <h2 className="text-foreground text-lg font-semibold">
                        Quartos
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Quartos físicos de cada unidade, com status e preço.
                    </p>
                </div>
                {canCreate && rooms.total > 0 && (
                    <NewRoomLink hotelId={hotel.id} unitId={unit.id} />
                )}
            </header>
            {!unit && <NoUnitsState hotelId={hotel.id} />}
            {unit && (
                <>
                    <UnitSelector
                        hotelId={hotel.id}
                        units={units}
                        selectedUnitId={unit.id}
                    />
                    <ManagedRoomList
                        hotelId={hotel.id}
                        unitId={unit.id}
                        items={rooms.items}
                        page={pagination.page}
                        pageSize={pagination.pageSize}
                        total={rooms.total}
                        canCreate={canCreate}
                    />
                </>
            )}
        </div>
    );
}
