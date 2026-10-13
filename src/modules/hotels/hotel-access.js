import { USER_ROLES } from "../../constants/user-roles.js";

export function canManageHotel(user, hotel) {
    return user.role === USER_ROLES.MANAGER && hotel.ownerUserId === user.id;
}

export function canViewHotel(user, hotel) {
    return user.role === USER_ROLES.ADMIN || canManageHotel(user, hotel);
}
