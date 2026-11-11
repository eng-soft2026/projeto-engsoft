import { notFound } from "next/navigation";
import { Badge } from "../../../../../../../components/ui/badge.jsx";
import { Card } from "../../../../../../../components/ui/card.jsx";
import { AMENITY_TARGETS } from "../../../../../../../constants/amenity.js";
import { USER_ROLES } from "../../../../../../../constants/user-roles.js";
import { NotFoundError } from "../../../../../../../lib/errors.js";
import { loadAmenityPickerData } from "../../../../../../../modules/amenities/amenity-picker-data.js";
import { AmenityPicker } from "../../../../../../../modules/amenities/components/amenity-picker.jsx";
import { requirePageRole } from "../../../../../../../modules/auth/guards.js";
import {
    canEditHotel,
    canOperateHotel,
} from "../../../../../../../modules/hotels/hotel-status-machine.js";
import { DeactivateRoomButton } from "../../../../../../../modules/rooms/components/deactivate-room-button.jsx";
import { RemoveRoomButton } from "../../../../../../../modules/rooms/components/remove-room-button.jsx";
import { RoomForm } from "../../../../../../../modules/rooms/components/room-form.jsx";
import {
    getRoomStatusLabel,
    getRoomStatusTone,
} from "../../../../../../../modules/rooms/room-labels.js";
import { roomParamsSchema } from "../../../../../../../schemas/room-schemas.js";
import { roomService } from "../../../../../../../services/room-service.js";
import { unitService } from "../../../../../../../services/unit-service.js";
import { loadManagedHotel } from "../../load-managed-hotel.js";
import { loadRoomTypeOptions } from "../load-room-type-options.js";

export const metadata = { title: "Editar quarto | Reserva de Hotéis" };

async function readOrNotFound(read) {
    try {
        return await read();
    } catch (error) {
        if (error instanceof NotFoundError) {
            notFound();
        }
        throw error;
    }
}

async function loadHotelRoom(manager, hotelId, roomId) {
    const params = roomParamsSchema.safeParse({ id: roomId });
    if (!params.success) {
        notFound();
    }

    const room = await readOrNotFound(() =>
        roomService.getRoom(manager, params.data.id),
    );
    const unit = await readOrNotFound(() =>
        unitService.getUnit(manager, room.unitId),
    );
    if (unit.hotelId !== hotelId) {
        notFound();
    }
    return { room, unit };
}

export default async function EditRoomPage({ params }) {
    const { id, roomId } = await params;
    const hotel = await loadManagedHotel(id);
    const manager = await requirePageRole([USER_ROLES.MANAGER]);
    const { room, unit } = await loadHotelRoom(manager, hotel.id, roomId);
    const roomTypeOptions = await loadRoomTypeOptions(
        manager,
        hotel.id,
        room.roomTypeId,
    );
    const isStructureEditable = canEditHotel(hotel.status) && room.isActive;
    const isOperationEditable = canOperateHotel(hotel.status) && room.isActive;
    const canDeactivate = isOperationEditable && !isStructureEditable;
    const amenityPicker = await loadAmenityPickerData(
        manager,
        AMENITY_TARGETS.ROOM,
        room.id,
    );

    return (
        <div className="flex max-w-2xl flex-col gap-4">
            <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-foreground text-lg font-semibold">
                        Quarto {room.number}
                    </h2>
                    <Badge tone={getRoomStatusTone(room.status)}>
                        {getRoomStatusLabel(room.status)}
                    </Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                    Unidade {unit.name}
                </p>
            </div>
            <Card>
                <RoomForm
                    hotelId={hotel.id}
                    room={room}
                    roomTypeOptions={roomTypeOptions}
                    isStructureEditable={isStructureEditable}
                    isOperationEditable={isOperationEditable}
                />
            </Card>
            <Card>
                <AmenityPicker
                    target={AMENITY_TARGETS.ROOM}
                    targetId={room.id}
                    isEditable={isStructureEditable}
                    {...amenityPicker}
                />
            </Card>
            {isOperationEditable && (
                <div className="flex flex-wrap gap-3">
                    {canDeactivate && <DeactivateRoomButton room={room} />}
                    <RemoveRoomButton hotelId={hotel.id} room={room} />
                </div>
            )}
        </div>
    );
}
