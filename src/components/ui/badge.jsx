import { joinClassNames } from "../../utils/class-names.js";

const BADGE_TONES = {
    neutral: "bg-muted text-muted-foreground",
    info: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
};

export function Badge({ tone = "neutral", className, children }) {
    return (
        <span
            className={joinClassNames(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                BADGE_TONES[tone],
                className,
            )}
        >
            {children}
        </span>
    );
}
