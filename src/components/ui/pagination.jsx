import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_LINK_CLASS =
    "inline-flex h-9 items-center gap-1 rounded-control border border-border bg-surface px-3 text-sm text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

const DISABLED_PAGE_CLASS =
    "inline-flex h-9 cursor-not-allowed items-center gap-1 rounded-control border border-border px-3 text-sm text-muted-foreground opacity-60";

export function countPages({ pageSize, total }) {
    return Math.max(1, Math.ceil(total / pageSize));
}

function PageLink({ href, isDisabled, label, children }) {
    if (isDisabled) {
        return (
            <span aria-disabled="true" className={DISABLED_PAGE_CLASS}>
                {children}
            </span>
        );
    }

    return (
        <Link href={href} aria-label={label} className={PAGE_LINK_CLASS}>
            {children}
        </Link>
    );
}

export function Pagination({ page, pageSize, total, buildHref }) {
    const totalPages = countPages({ pageSize, total });

    if (totalPages === 1) {
        return null;
    }

    const isFirstPage = page <= 1;
    const isLastPage = page >= totalPages;

    return (
        <nav
            aria-label="Paginação"
            className="flex items-center justify-between gap-4"
        >
            <PageLink
                href={isFirstPage ? undefined : buildHref(page - 1)}
                isDisabled={isFirstPage}
                label="Página anterior"
            >
                <ChevronLeft aria-hidden="true" className="size-4" />
                Anterior
            </PageLink>
            <p className="text-muted-foreground text-sm">
                Página {page} de {totalPages}
            </p>
            <PageLink
                href={isLastPage ? undefined : buildHref(page + 1)}
                isDisabled={isLastPage}
                label="Próxima página"
            >
                Próxima
                <ChevronRight aria-hidden="true" className="size-4" />
            </PageLink>
        </nav>
    );
}
