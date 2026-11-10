import { getControlClassName, getInvalidProps } from "./control-styles.js";

export function Select({
    options = [],
    placeholder,
    isInvalid = false,
    className,
    ...props
}) {
    return (
        <select
            className={getControlClassName({ isInvalid, className })}
            {...getInvalidProps(isInvalid)}
            {...props}
        >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((option) => (
                <option
                    key={option.value}
                    value={option.value}
                    disabled={option.isDisabled}
                >
                    {option.label}
                </option>
            ))}
        </select>
    );
}
