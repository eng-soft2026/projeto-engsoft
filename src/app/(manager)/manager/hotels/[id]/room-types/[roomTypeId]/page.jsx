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
import { RemoveRoomTypeButton } from "../../../../../../../modules/room-types/components/remove-room-type-button.jsx";
import { RoomTypeForm } from "../../../../../../../modules/room-types/components/room-type-form.jsx";
import { roomTypeParamsSchema } from "../../../../../../../schemas/room-type-schemas.js";
import { roomTypeService } from "../../../../../../../services/room-type-service.js";
import { loadManagedHotel } from "../../load-managed-hotel.js";

export const metadata = {
    title: "Editar tipo de acomodação | Reserva de Hotéis",
};

async function loadHotelRoomType(manager, hotelId, roomTypeId) {
    const params = roomTypeParamsSchema.safeParse({ id: roomTypeId });
    if (!params.success) {
        notFound();
    }

    let roomType;
    try {
        roomType = await roomTypeService.getRoomType(manager, params.data.id);
    } catch (error) {
        if (error instanceof NotFoundError) {
            notFound();
        }
        throw error;
    }

    if (roomType.hotelId !== hotelId) {
        notFound();
    }
    return roomType;
}

export default async function EditRoomTypePage({ params }) {
    const { id, roomTypeId } = await params;
    const hotel = await loadManagedHotel(id);
    const manager = await requirePageRole([USER_ROLES.MANAGER]);
    const roomType = await loadHotelRoomType(manager, hotel.id, roomTypeId);
    const isStructureEditable = canEditHotel(hotel.status) && roomType.isActive;
    const isPriceEditable = canOperateHotel(hotel.status) && roomType.isActive;
    const amenityPicker = await loadAmenityPickerData(
        manager,
        AMENITY_TARGETS.ROOM_TYPE,
        roomType.id,
    );

    return (
        <div className="flex max-w-2xl flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-foreground text-lg font-semibold">
                    {roomType.name}
                </h2>
                {!roomType.isActive && <Badge tone="warning">Inativo</Badge>}
            </div>
            <Card>
                <RoomTypeForm
                    hotelId={hotel.id}
                    roomType={roomType}
                    isStructureEditable={isStructureEditable}
                    isPriceEditable={isPriceEditable}
                />
            </Card>
            <Card>
                <AmenityPicker
                    target={AMENITY_TARGETS.ROOM_TYPE}
                    targetId={roomType.id}
                    isEditable={isStructureEditable}
                    {...amenityPicker}
                />
            </Card>
            {isStructureEditable && (
                <RemoveRoomTypeButton hotelId={hotel.id} roomType={roomType} />
            )}
        </div>
    );
}
