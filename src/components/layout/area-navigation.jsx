"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { joinClassNames } from "../../utils/class-names.js";
import { isNavigationItemActive } from "./navigation-links.js";

export function AreaNavigation({ label, items }) {
    const pathname = usePathname();

    return (
        <nav aria-label={label} className="md:w-56 md:shrink-0">
            <ul className="flex gap-1 overflow-x-auto md:flex-col">
                {items.map((item) => {
                    const isActive = isNavigationItemActive(item, pathname);

                    return (
                        <li key={item.href} className="shrink-0">
                            <Link
                                href={item.href}
                                aria-current={isActive ? "page" : undefined}
                                className={joinClassNames(
                                    "rounded-control block px-3 py-2 text-sm font-medium whitespace-nowrap",
                                    isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "text-foreground hover:bg-muted",
                                )}
                            >
                                {item.label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
