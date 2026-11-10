import { getControlClassName, getInvalidProps } from "./control-styles.js";

export function Textarea({ rows = 4, isInvalid = false, className, ...props }) {
    return (
        <textarea
            rows={rows}
            className={getControlClassName({ isInvalid, className })}
            {...getInvalidProps(isInvalid)}
            {...props}
        />
    );
}
