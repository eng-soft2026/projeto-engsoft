import { Card } from "../../../../../components/ui/card.jsx";
import { EditHotelForm } from "../../../../../modules/hotels/components/edit-hotel-form.jsx";
import { loadManagedHotel } from "./load-managed-hotel.js";

export const metadata = { title: "Editar hotel | Reserva de Hotéis" };

export default async function ManagedHotelPage({ params }) {
    const { id } = await params;
    const hotel = await loadManagedHotel(id);

    return (
        <Card className="max-w-2xl">
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
    );
}
