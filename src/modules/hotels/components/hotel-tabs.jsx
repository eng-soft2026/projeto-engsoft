"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { joinClassNames } from "../../../utils/class-names.js";
import {
    buildManagedHotelHref,
    isSectionActive,
    listManagedHotelSections,
} from "../managed-hotel-routes.js";

const TAB_CLASS =
    "focus-visible:ring-ring -mb-px inline-flex h-10 shrink-0 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap focus-visible:ring-2 focus-visible:outline-none";

const ACTIVE_TAB_CLASS = "border-primary text-primary";

const INACTIVE_TAB_CLASS =
    "text-muted-foreground hover:text-foreground border-transparent";

export function HotelTabs({ hotelId, isOwner = false }) {
    const pathname = usePathname();

    return (
        <nav
            aria-label="Seções do hotel"
            className="border-border overflow-x-auto border-b"
        >
            <ul className="flex">
                {listManagedHotelSections(isOwner).map(({ label, segment }) => {
                    const isActive = isSectionActive(
                        pathname,
                        hotelId,
                        segment,
                    );
                    return (
                        <li key={label}>
                            <Link
                                href={buildManagedHotelHref(hotelId, segment)}
                                aria-current={isActive ? "page" : undefined}
                                className={joinClassNames(
                                    TAB_CLASS,
                                    isActive
                                        ? ACTIVE_TAB_CLASS
                                        : INACTIVE_TAB_CLASS,
                                )}
                            >
                                {label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
