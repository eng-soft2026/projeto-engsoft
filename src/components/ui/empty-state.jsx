import { Inbox } from "lucide-react";
import { joinClassNames } from "../../utils/class-names.js";

export function EmptyState({
    icon: Icon = Inbox,
    title,
    description,
    action,
    className,
}) {
    return (
        <div
            className={joinClassNames(
                "rounded-card border-border flex flex-col items-center gap-3 border border-dashed px-6 py-10 text-center",
                className,
            )}
        >
            <Icon
                aria-hidden="true"
                className="text-muted-foreground size-10"
            />
            <h2 className="text-foreground text-base font-semibold">{title}</h2>
            {description && (
                <p className="text-muted-foreground max-w-md text-sm">
                    {description}
                </p>
            )}
            {action}
        </div>
    );
}
