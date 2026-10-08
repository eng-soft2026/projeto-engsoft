export function hasDateConflict(rangeA, rangeB) {
    return rangeA.checkIn < rangeB.checkOut && rangeA.checkOut > rangeB.checkIn;
}
