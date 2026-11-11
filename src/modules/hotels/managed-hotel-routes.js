export const MANAGED_HOTELS_HREF = "/manager/hotels";

export const MANAGED_HOTEL_SECTIONS = Object.freeze([
    Object.freeze({ label: "Dados", segment: "" }),
    Object.freeze({ label: "Unidades", segment: "units" }),
    Object.freeze({ label: "Tipos de acomodação", segment: "room-types" }),
    Object.freeze({ label: "Quartos", segment: "rooms" }),
    Object.freeze({ label: "Gestores", segment: "managers" }),
    Object.freeze({ label: "Políticas", segment: "policies" }),
]);

export function buildManagedHotelHref(hotelId, segment = "") {
    const hotelHref = `${MANAGED_HOTELS_HREF}/${hotelId}`;
    if (!segment) {
        return hotelHref;
    }
    return `${hotelHref}/${segment}`;
}

export function isSectionActive(pathname, hotelId, segment) {
    const sectionHref = buildManagedHotelHref(hotelId, segment);
    if (!segment) {
        return pathname === sectionHref;
    }
    return pathname === sectionHref || pathname.startsWith(`${sectionHref}/`);
}
