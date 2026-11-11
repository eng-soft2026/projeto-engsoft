import { redirect } from "next/navigation";
import { Card } from "../../../../../../../components/ui/card.jsx";
import { isHotelEditable } from "../../../../../../../modules/hotels/hotel-editability.js";
import { UnitForm } from "../../../../../../../modules/units/components/unit-form.jsx";
import { buildUnitsHref } from "../../../../../../../modules/units/unit-routes.js";
import { loadManagedHotel } from "../../load-managed-hotel.js";

export const metadata = { title: "Cadastrar unidade | Reserva de Hotéis" };

export default async function CreateUnitPage({ params }) {
    const { id } = await params;
    const hotel = await loadManagedHotel(id);
    if (!isHotelEditable(hotel.status)) {
        redirect(buildUnitsHref(hotel.id));
    }

    return (
        <div className="flex max-w-2xl flex-col gap-4">
            <h2 className="text-foreground text-lg font-semibold">
                Cadastrar unidade
            </h2>
            <Card>
                <UnitForm hotelId={hotel.id} isEditable />
            </Card>
        </div>
    );
}
