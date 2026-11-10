import { getControlClassName, getInvalidProps } from "./control-styles.js";

export function Input({
    type = "text",
    isInvalid = false,
    className,
    ...props
}) {
    return (
        <input
            type={type}
            className={getControlClassName({ isInvalid, className })}
            {...getInvalidProps(isInvalid)}
            {...props}
        />
    );
}
