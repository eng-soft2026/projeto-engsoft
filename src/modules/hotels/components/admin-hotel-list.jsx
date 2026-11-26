import Link from "next/link";
import { Building2 } from "lucide-react";
import { HOTEL_STATUSES } from "../../../constants/hotel-statuses.js";
import { Badge } from "../../../components/ui/badge.jsx";
import { EmptyState } from "../../../components/ui/empty-state.jsx";
import { Pagination } from "../../../components/ui/pagination.jsx";
import { joinClassNames } from "../../../utils/class-names.js";
import { formatCnpj } from "../../../utils/cnpj.js";
import {
    ADMIN_HOTEL_STATUS_FILTERS,
    buildAdminHotelHref,
    buildAdminHotelsHref,
} from "../admin-hotel-filters.js";
import { HOTEL_ACTIONS } from "../hotel-status-machine.js";
import {
    getHotelStatusLabel,
    getHotelStatusTone,
} from "../hotel-status-labels.js";
import { AdminHotelActions } from "./admin-hotel-actions.jsx";

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

const UNBLOCK_ONLY = Object.freeze([HOTEL_ACTIONS.UNBLOCK]);

function LastBlockNote({ note }) {
    if (!note) {
        return (
            <p className="text-muted-foreground text-sm">
                Motivo do bloqueio não registrado.
            </p>
        );
    }

    return (
        <div className="border-border flex flex-col gap-1 border-l-2 pl-3">
            <p className="text-muted-foreground text-xs">
                Último motivo do bloqueio, em{" "}
                <time dateTime={new Date(note.createdAt).toISOString()}>
                    {formatHotelUpdatedAt(note.createdAt)}
                </time>
            </p>
            <p className="text-foreground text-sm whitespace-pre-line">
                {note.notes}
            </p>
        </div>
    );
}

function BlockedHotelItem({ hotel }) {
    return (
        <li className="rounded-card border-border bg-surface flex flex-col gap-3 border p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <AdminHotelSummary hotel={hotel} />
                <Badge tone={getHotelStatusTone(hotel.status)}>
                    {getHotelStatusLabel(hotel.status)}
                </Badge>
            </div>
            <LastBlockNote note={hotel.lastBlockNote} />
            <AdminHotelActions
                hotelId={hotel.id}
                status={hotel.status}
                allowedActions={UNBLOCK_ONLY}
            />
        </li>
    );
}

function AdminHotelSummary({ hotel }) {
    return (
        <div className="flex flex-col gap-1">
            <Link
                href={buildAdminHotelHref(hotel.id)}
                className="text-foreground hover:text-primary focus-visible:ring-ring rounded-control self-start font-medium focus-visible:ring-2 focus-visible:outline-none"
            >
                {hotel.name}
            </Link>
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
    );
}

function AdminHotelItem({ hotel }) {
    return (
        <li className="rounded-card border-border bg-surface flex flex-col gap-2 border p-4 sm:flex-row sm:items-center sm:justify-between">
            <AdminHotelSummary hotel={hotel} />
            <Badge tone={getHotelStatusTone(hotel.status)}>
                {getHotelStatusLabel(hotel.status)}
            </Badge>
        </li>
    );
}

export function AdminHotelList({ items, filter, page, pageSize, total }) {
    const isBlockedFilter = filter === HOTEL_STATUSES.BLOCKED;

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
                {items.map((hotel) =>
                    isBlockedFilter &&
                    hotel.status === HOTEL_STATUSES.BLOCKED ? (
                        <BlockedHotelItem key={hotel.id} hotel={hotel} />
                    ) : (
                        <AdminHotelItem key={hotel.id} hotel={hotel} />
                    ),
                )}
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
