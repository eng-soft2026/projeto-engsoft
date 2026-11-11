import { notFound } from "next/navigation";
import { Card } from "../../../../../../components/ui/card.jsx";
import { HotelManagersPanel } from "../../../../../../modules/hotels/components/hotel-managers-panel.jsx";
import { loadManagedHotel } from "../load-managed-hotel.js";

export const metadata = { title: "Gestores do hotel | Reserva de Hotéis" };

export default async function HotelManagersPage({ params }) {
    const { id } = await params;
    const hotel = await loadManagedHotel(id);
    if (!hotel.isOwner) {
        notFound();
    }

    return (
        <Card className="max-w-2xl">
            <HotelManagersPanel
                hotelId={hotel.id}
                owner={hotel.owner}
                managers={hotel.managers}
            />
        </Card>
    );
}
