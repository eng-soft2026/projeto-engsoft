import { HotelTabs } from "../../../../../modules/hotels/components/hotel-tabs.jsx";
import { ManagedHotelHeader } from "../../../../../modules/hotels/components/managed-hotel-header.jsx";
import { loadManagedHotel } from "./load-managed-hotel.js";

export default async function ManagedHotelLayout({ children, params }) {
    const { id } = await params;
    const hotel = await loadManagedHotel(id);

    return (
        <>
            <ManagedHotelHeader hotel={hotel} />
            <HotelTabs hotelId={hotel.id} />
            {children}
        </>
    );
}
