import { useId } from "react";
import { joinClassNames } from "../../utils/class-names.js";
import { getInvalidProps } from "./control-styles.js";

export function Checkbox({
    id,
    label,
    isInvalid = false,
    className,
    ...props
}) {
    const generatedId = useId();
    const checkboxId = id ?? generatedId;

    return (
        <div className={joinClassNames("flex items-center gap-2", className)}>
            <input
                id={checkboxId}
                type="checkbox"
                className="border-border accent-primary focus-visible:ring-ring size-4 rounded focus-visible:ring-2 disabled:cursor-not-allowed"
                {...getInvalidProps(isInvalid)}
                {...props}
            />
            <label htmlFor={checkboxId} className="text-foreground text-sm">
                {label}
            </label>
        </div>
    );
}
