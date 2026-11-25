import Link from "next/link";
import { Building2 } from "lucide-react";
import { Badge } from "../../../components/ui/badge.jsx";
import { EmptyState } from "../../../components/ui/empty-state.jsx";
import { Pagination } from "../../../components/ui/pagination.jsx";
import { joinClassNames } from "../../../utils/class-names.js";
import { formatCnpj } from "../../../utils/cnpj.js";
import {
    ADMIN_HOTEL_STATUS_FILTERS,
    buildAdminHotelsHref,
} from "../admin-hotel-filters.js";
import {
    getHotelStatusLabel,
    getHotelStatusTone,
} from "../hotel-status-labels.js";

const UPDATED_AT_FORMAT = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
});

const FILTER_LINK_CLASS =
    "rounded-control focus-visible:ring-ring inline-flex h-9 items-center px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none";

export function formatHotelUpdatedAt(value) {
    return UPDATED_AT_FORMAT.format(new Date(value));
}

function findEmptyTitle(filter) {
    return ADMIN_HOTEL_STATUS_FILTERS.find(({ value }) => value === filter)
        .emptyTitle;
}

export function AdminHotelStatusFilter({ filter }) {
    return (
        <nav aria-label="Filtrar por status">
            <ul className="flex flex-wrap gap-2">
                {ADMIN_HOTEL_STATUS_FILTERS.map(({ value, label }) => {
                    const isCurrent = value === filter;
                    return (
                        <li key={value}>
                            <Link
                                href={buildAdminHotelsHref({ filter: value })}
                                aria-current={isCurrent ? "page" : undefined}
                                className={joinClassNames(
                                    FILTER_LINK_CLASS,
                                    isCurrent
                                        ? "bg-primary text-primary-foreground"
                                        : "border-border bg-surface text-foreground hover:bg-muted border",
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

function AdminHotelItem({ hotel }) {
    return (
        <li className="rounded-card border-border bg-surface flex flex-col gap-2 border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
                <p className="text-foreground font-medium">{hotel.name}</p>
                <p className="text-muted-foreground text-sm">
                    {hotel.category} · CNPJ {formatCnpj(hotel.cnpj)}
                </p>
                <p className="text-muted-foreground text-sm">
                    Proprietário: {hotel.owner.name} ({hotel.owner.email})
                </p>
                <p className="text-muted-foreground text-xs">
                    Atualizado em {formatHotelUpdatedAt(hotel.updatedAt)}
                </p>
            </div>
            <Badge tone={getHotelStatusTone(hotel.status)}>
                {getHotelStatusLabel(hotel.status)}
            </Badge>
        </li>
    );
}

export function AdminHotelList({ items, filter, page, pageSize, total }) {
    if (total === 0) {
        return (
            <EmptyState
                icon={Building2}
                title={findEmptyTitle(filter)}
                description="Use os filtros acima para ver hotéis em outros status."
            />
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <ul className="flex flex-col gap-3">
                {items.map((hotel) => (
                    <AdminHotelItem key={hotel.id} hotel={hotel} />
                ))}
            </ul>
            <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                buildHref={(nextPage) =>
                    buildAdminHotelsHref({ filter, page: nextPage })
                }
            />
        </div>
    );
}
