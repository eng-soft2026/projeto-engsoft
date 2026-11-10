"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Menu, X } from "lucide-react";
import { LogoutButton } from "./logout-button.jsx";

export function MobileMenu({ links, isSignedIn = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const menuId = useId();

    function closeMenu() {
        setIsOpen(false);
    }

    function handleKeyDown(event) {
        if (event.key === "Escape") {
            closeMenu();
        }
    }

    return (
        <div className="md:hidden" onKeyDown={handleKeyDown}>
            <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={menuId}
                aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
                onClick={() => setIsOpen(!isOpen)}
                className="rounded-control text-foreground hover:bg-muted focus-visible:ring-ring inline-flex size-10 items-center justify-center focus-visible:ring-2 focus-visible:outline-none"
            >
                {isOpen ? (
                    <X aria-hidden="true" className="size-5" />
                ) : (
                    <Menu aria-hidden="true" className="size-5" />
                )}
            </button>
            {isOpen && (
                <nav
                    id={menuId}
                    aria-label="Menu principal"
                    className="border-border bg-surface px-gutter absolute inset-x-0 top-full border-b py-3 shadow-md"
                >
                    <ul className="flex flex-col gap-1">
                        {links.map((link) => (
                            <li key={link.href}>
                                <Link
                                    href={link.href}
                                    onClick={closeMenu}
                                    className="rounded-control text-foreground hover:bg-muted block px-3 py-2 text-sm"
                                >
                                    {link.label}
                                </Link>
                            </li>
                        ))}
                        {isSignedIn && (
                            <li>
                                <LogoutButton
                                    onLoggedOut={closeMenu}
                                    className="w-full justify-start"
                                />
                            </li>
                        )}
                    </ul>
                </nav>
            )}
        </div>
    );
}
