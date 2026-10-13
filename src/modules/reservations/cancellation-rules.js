import { USER_ROLES } from "../../constants/user-roles.js";
import {
    ConflictError,
    ERROR_CODES,
    ForbiddenError,
} from "../../lib/errors.js";

const MS_PER_HOUR = 60 * 60 * 1000;
const CUSTOMER_REFUND_DEADLINE_IN_HOURS = 24;
const MANAGER_CANCELLATION_DEADLINE_IN_HOURS = 48;

function hoursUntil(checkIn, now) {
    return (checkIn - now) / MS_PER_HOUR;
}

function evaluateCustomerCancellation(hoursToCheckIn) {
    return {
        isRefundable: hoursToCheckIn >= CUSTOMER_REFUND_DEADLINE_IN_HOURS,
    };
}

function evaluateManagerCancellation(hoursToCheckIn) {
    if (hoursToCheckIn < MANAGER_CANCELLATION_DEADLINE_IN_HOURS) {
        throw new ConflictError(
            ERROR_CODES.RESERVATION_CANNOT_BE_CANCELLED,
            "Managers can only cancel up to 48 hours before check-in.",
        );
    }

    return { isRefundable: true };
}

export function evaluateCancellation({ requestedByRole, checkIn, now }) {
    const hoursToCheckIn = hoursUntil(checkIn, now);

    if (requestedByRole === USER_ROLES.CUSTOMER) {
        return evaluateCustomerCancellation(hoursToCheckIn);
    }

    if (requestedByRole === USER_ROLES.MANAGER) {
        return evaluateManagerCancellation(hoursToCheckIn);
    }

    throw new ForbiddenError(
        "Only customers and managers can cancel a reservation.",
    );
}
