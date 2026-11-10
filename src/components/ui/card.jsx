import { joinClassNames } from "../../utils/class-names.js";

export function Card({
    as: Element = "section",
    className,
    children,
    ...props
}) {
    return (
        <Element
            className={joinClassNames(
                "rounded-card border-border bg-surface border p-6 shadow-sm",
                className,
            )}
            {...props}
        >
            {children}
        </Element>
    );
}

export function CardTitle({ as: Heading = "h2", className, children }) {
    return (
        <Heading
            className={joinClassNames(
                "text-foreground text-lg font-semibold",
                className,
            )}
        >
            {children}
        </Heading>
    );
}
