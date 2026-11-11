import { redirect } from "next/navigation";
import { Card } from "../../../../../../../components/ui/card.jsx";
import { isHotelEditable } from "../../../../../../../modules/hotels/hotel-editability.js";
import { RoomTypeForm } from "../../../../../../../modules/room-types/components/room-type-form.jsx";
import { buildRoomTypesHref } from "../../../../../../../modules/room-types/room-type-routes.js";
import { loadManagedHotel } from "../../load-managed-hotel.js";

export const metadata = {
    title: "Cadastrar tipo de acomodação | Reserva de Hotéis",
};

export default async function CreateRoomTypePage({ params }) {
    const { id } = await params;
    const hotel = await loadManagedHotel(id);
    if (!isHotelEditable(hotel.status)) {
        redirect(buildRoomTypesHref(hotel.id));
    }

    return (
        <div className="flex max-w-2xl flex-col gap-4">
            <h2 className="text-foreground text-lg font-semibold">
                Cadastrar tipo de acomodação
            </h2>
            <Card>
                <RoomTypeForm
                    hotelId={hotel.id}
                    isStructureEditable
                    isPriceEditable
                />
            </Card>
        </div>
    );
}
