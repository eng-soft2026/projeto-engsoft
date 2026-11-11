import { GEOCODING_COORDINATE_DECIMALS } from "../../constants/geocoding.js";

function toCoordinate(value) {
    if (value === null || value === undefined) {
        return null;
    }
    return Number(value.toString());
}

export function toClientUnit(unit) {
    return {
        ...unit,
        address: {
            ...unit.address,
            latitude: toCoordinate(unit.address.latitude),
            longitude: toCoordinate(unit.address.longitude),
        },
    };
}

export function hasCoordinates(address) {
    return address.latitude !== null && address.longitude !== null;
}

export function roundCoordinate(value) {
    return Number(value.toFixed(GEOCODING_COORDINATE_DECIMALS));
}
