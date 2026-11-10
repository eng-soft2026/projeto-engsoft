import Link from "next/link";
import { Card } from "../../../components/ui/card.jsx";

export function AuthPageLayout({
    title,
    description,
    footerText,
    footerLinkLabel,
    footerHref,
    children,
}) {
    return (
        <section className="px-gutter py-section flex flex-1 items-start justify-center sm:items-center">
            <Card className="flex w-full max-w-md flex-col gap-6">
                <header className="flex flex-col gap-1">
                    <h1 className="text-foreground text-2xl font-semibold">
                        {title}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {description}
                    </p>
                </header>
                {children}
                <p className="text-muted-foreground text-center text-sm">
                    {footerText}{" "}
                    <Link
                        href={footerHref}
                        className="text-primary font-medium hover:underline"
                    >
                        {footerLinkLabel}
                    </Link>
                </p>
            </Card>
        </section>
    );
}
