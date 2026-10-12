const UNIQUE_CONSTRAINT_VIOLATION_CODE = "P2002";

export function isUniqueConstraintViolation(error) {
    return error?.code === UNIQUE_CONSTRAINT_VIOLATION_CODE;
}
