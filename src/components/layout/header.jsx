import Link from "next/link";
import { Hotel } from "lucide-react";
import { LogoutButton } from "./logout-button.jsx";
import { MobileMenu } from "./mobile-menu.jsx";
import { getNavigationItems } from "./navigation-links.js";

function getFirstName(name) {
    return name.trim().split(/\s+/)[0];
}

export function Header({
    user = null,
    links = getNavigationItems(user?.role),
}) {
    const isSignedIn = Boolean(user);

    return (
        <header className="border-border bg-surface relative border-b">
            <div className="max-w-page px-gutter mx-auto flex h-16 items-center justify-between">
                <Link
                    href="/"
                    className="text-primary flex items-center gap-2 text-lg font-semibold"
                >
                    <Hotel aria-hidden="true" className="size-6" />
                    Reserva de Hotéis
                </Link>
                <nav
                    aria-label="Navegação principal"
                    className="hidden md:block"
                >
                    <ul className="flex items-center gap-2">
                        {links.map((link) => (
                            <li key={link.href}>
                                <Link
                                    href={link.href}
                                    className="rounded-control text-foreground hover:bg-muted px-3 py-2 text-sm font-medium"
                                >
                                    {link.label}
                                </Link>
                            </li>
                        ))}
                        {isSignedIn && (
                            <>
                                <li className="text-muted-foreground px-3 text-sm">
                                    Olá, {getFirstName(user.name)}
                                </li>
                                <li>
                                    <LogoutButton />
                                </li>
                            </>
                        )}
                    </ul>
                </nav>
                <MobileMenu links={links} isSignedIn={isSignedIn} />
            </div>
        </header>
    );
}
