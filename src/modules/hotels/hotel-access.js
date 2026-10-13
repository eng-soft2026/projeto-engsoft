import { USER_ROLES } from "../../constants/user-roles.js";

function isManager(user) {
    return user.role === USER_ROLES.MANAGER;
}

export function isHotelOwner(user, hotel) {
    return isManager(user) && hotel.ownerUserId === user.id;
}

export function isAdditionalManager(user, hotel) {
    const managers = hotel.managers ?? [];
    return isManager(user) && managers.some(({ userId }) => userId === user.id);
}

export function canManageHotel(user, hotel) {
    return isHotelOwner(user, hotel) || isAdditionalManager(user, hotel);
}

export function canViewHotel(user, hotel) {
    return user.role === USER_ROLES.ADMIN || canManageHotel(user, hotel);
}

export function canViewHotelManagers(user, hotel) {
    return user.role === USER_ROLES.ADMIN || isHotelOwner(user, hotel);
}
