import { canEditHotel } from "./hotel-status-machine.js";

export function isHotelEditable(status) {
    return canEditHotel(status);
}
