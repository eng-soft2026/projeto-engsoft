import { redirect } from "next/navigation";
import { Card } from "../../../../../../../components/ui/card.jsx";
import { USER_ROLES } from "../../../../../../../constants/user-roles.js";
import { NotFoundError } from "../../../../../../../lib/errors.js";
import { requirePageRole } from "../../../../../../../modules/auth/guards.js";
import { isHotelEditable } from "../../../../../../../modules/hotels/hotel-editability.js";
import { RoomForm } from "../../../../../../../modules/rooms/components/room-form.jsx";
import { buildRoomsHref } from "../../../../../../../modules/rooms/room-routes.js";
import { unitParamsSchema } from "../../../../../../../schemas/unit-schemas.js";
import { unitService } from "../../../../../../../services/unit-service.js";
import { loadManagedHotel } from "../../load-managed-hotel.js";
import { loadRoomTypeOptions } from "../load-room-type-options.js";

export const metadata = { title: "Cadastrar quarto | Reserva de Hotéis" };

async function findHotelUnit(manager, hotelId, unitId) {
    const params = unitParamsSchema.safeParse({ id: unitId });
    if (!params.success) {
        return null;
    }

    try {
        const unit = await unitService.getUnit(manager, params.data.id);
        return unit.hotelId === hotelId ? unit : null;
    } catch (error) {
        if (error instanceof NotFoundError) {
            return null;
        }
        throw error;
    }
}

export default async function CreateRoomPage({ params, searchParams }) {
    const { id } = await params;
    const { unit: unitId } = await searchParams;
    const hotel = await loadManagedHotel(id);
    if (!isHotelEditable(hotel.status)) {
        redirect(buildRoomsHref(hotel.id, { unitId }));
    }

    const manager = await requirePageRole([USER_ROLES.MANAGER]);
    const unit = await findHotelUnit(manager, hotel.id, unitId);
    if (!unit?.isActive) {
        redirect(buildRoomsHref(hotel.id, { unitId: unit?.id }));
    }
    const roomTypeOptions = await loadRoomTypeOptions(manager, hotel.id);

    return (
        <div className="flex max-w-2xl flex-col gap-4">
            <div className="flex flex-col gap-1">
                <h2 className="text-foreground text-lg font-semibold">
                    Cadastrar quarto
                </h2>
                <p className="text-muted-foreground text-sm">
                    Unidade {unit.name}
                </p>
            </div>
            <Card>
                <RoomForm
                    hotelId={hotel.id}
                    unitId={unit.id}
                    roomTypeOptions={roomTypeOptions}
                    isStructureEditable
                    isOperationEditable
                />
            </Card>
        </div>
    );
}
