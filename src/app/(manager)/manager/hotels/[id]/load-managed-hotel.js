import { cache } from "react";
import { notFound } from "next/navigation";
import { USER_ROLES } from "../../../../../constants/user-roles.js";
import { NotFoundError } from "../../../../../lib/errors.js";
import { isHotelOwner } from "../../../../../modules/hotels/hotel-access.js";
import { requirePageRole } from "../../../../../modules/auth/guards.js";
import { hotelParamsSchema } from "../../../../../schemas/hotel-schemas.js";
import { hotelService } from "../../../../../services/hotel-service.js";

async function readManagedHotel(hotelId) {
    const manager = await requirePageRole([USER_ROLES.MANAGER]);
    const params = hotelParamsSchema.safeParse({ id: hotelId });
    if (!params.success) {
        notFound();
    }

    try {
        const hotel = await hotelService.getHotel(manager, params.data.id);
        return { ...hotel, isOwner: isHotelOwner(manager, hotel) };
    } catch (error) {
        if (error instanceof NotFoundError) {
            notFound();
        }
        throw error;
    }
}

export const loadManagedHotel = cache(readManagedHotel);
