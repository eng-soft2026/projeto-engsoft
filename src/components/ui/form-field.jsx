import { cloneElement, useId } from "react";
import { joinClassNames } from "../../utils/class-names.js";

function joinDescribedBy(...ids) {
    const describedBy = ids.filter(Boolean).join(" ");
    return describedBy || undefined;
}

export function FormField({
    label,
    hint,
    error,
    isRequired = false,
    className,
    children,
}) {
    const generatedId = useId();
    const controlId = children.props.id ?? generatedId;
    const hintId = hint ? `${controlId}-hint` : undefined;
    const errorId = error ? `${controlId}-error` : undefined;
    const hasError = Boolean(error);

    const control = cloneElement(children, {
        id: controlId,
        isInvalid: hasError,
        required: isRequired || children.props.required,
        "aria-describedby": joinDescribedBy(
            children.props["aria-describedby"],
            hintId,
            errorId,
        ),
    });

    return (
        <div className={joinClassNames("flex flex-col gap-1", className)}>
            <label
                htmlFor={controlId}
                className="text-foreground text-sm font-medium"
            >
                {label}
                {isRequired && (
                    <span aria-hidden="true" className="text-danger ml-0.5">
                        *
                    </span>
                )}
            </label>
            {control}
            {hint && (
                <p id={hintId} className="text-muted-foreground text-xs">
                    {hint}
                </p>
            )}
            {hasError && (
                <p id={errorId} role="alert" className="text-danger text-xs">
                    {error}
                </p>
            )}
        </div>
    );
}
