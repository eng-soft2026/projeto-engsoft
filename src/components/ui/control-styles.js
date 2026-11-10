import { joinClassNames } from "../../utils/class-names.js";

const CONTROL_BASE =
    "w-full rounded-control border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70";

export function getControlClassName({ isInvalid, className }) {
    return joinClassNames(
        CONTROL_BASE,
        isInvalid ? "border-danger" : "border-border",
        className,
    );
}

export function getInvalidProps(isInvalid) {
    return isInvalid ? { "aria-invalid": true } : {};
}
