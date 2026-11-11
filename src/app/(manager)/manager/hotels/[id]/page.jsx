import { Card } from "../../../../../components/ui/card.jsx";
import { AMENITY_TARGETS } from "../../../../../constants/amenity.js";
import { USER_ROLES } from "../../../../../constants/user-roles.js";
import { loadAmenityPickerData } from "../../../../../modules/amenities/amenity-picker-data.js";
import { AmenityPicker } from "../../../../../modules/amenities/components/amenity-picker.jsx";
import { requirePageRole } from "../../../../../modules/auth/guards.js";
import { isHotelEditable } from "../../../../../modules/hotels/hotel-editability.js";
import { EditHotelForm } from "../../../../../modules/hotels/components/edit-hotel-form.jsx";
import { loadManagedHotel } from "./load-managed-hotel.js";

export const metadata = { title: "Editar hotel | Reserva de Hotéis" };

export default async function ManagedHotelPage({ params }) {
    const { id } = await params;
    const hotel = await loadManagedHotel(id);
    const manager = await requirePageRole([USER_ROLES.MANAGER]);
    const amenityPicker = await loadAmenityPickerData(
        manager,
        AMENITY_TARGETS.HOTEL,
        hotel.id,
    );

    return (
        <div className="flex max-w-2xl flex-col gap-6">
            <Card>
                <EditHotelForm
                    hotel={{
                        id: hotel.id,
                        status: hotel.status,
                        name: hotel.name,
                        description: hotel.description,
                        category: hotel.category,
                        cnpj: hotel.cnpj,
                        email: hotel.email,
                    }}
                />
            </Card>
            <Card>
                <AmenityPicker
                    target={AMENITY_TARGETS.HOTEL}
                    targetId={hotel.id}
                    isEditable={isHotelEditable(hotel.status)}
                    {...amenityPicker}
                />
            </Card>
        </div>
    );
}
