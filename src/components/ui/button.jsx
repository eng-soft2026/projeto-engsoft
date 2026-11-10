import { joinClassNames } from "../../utils/class-names.js";
import { Spinner } from "./spinner.jsx";

const BUTTON_VARIANTS = {
    primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
    secondary: "border border-border bg-surface text-foreground hover:bg-muted",
    danger: "bg-danger text-primary-foreground hover:bg-danger-hover",
    ghost: "text-foreground hover:bg-muted",
};

const BUTTON_SIZES = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
};

export function Button({
    variant = "primary",
    size = "md",
    type = "button",
    isLoading = false,
    disabled = false,
    className,
    children,
    ...props
}) {
    const isDisabled = disabled || isLoading;

    return (
        <button
            type={type}
            disabled={isDisabled}
            aria-busy={isLoading || undefined}
            className={joinClassNames(
                "rounded-control focus-visible:ring-ring inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
                BUTTON_VARIANTS[variant],
                BUTTON_SIZES[size],
                className,
            )}
            {...props}
        >
            {isLoading && <Spinner label="Processando" />}
            {children}
        </button>
    );
}
