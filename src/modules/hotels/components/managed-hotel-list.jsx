import Link from "next/link";
import { Building2 } from "lucide-react";
import { Badge } from "../../../components/ui/badge.jsx";
import { EmptyState } from "../../../components/ui/empty-state.jsx";
import { Pagination } from "../../../components/ui/pagination.jsx";
import { formatCnpj } from "../../../utils/cnpj.js";
import {
    getHotelStatusLabel,
    getHotelStatusTone,
} from "../hotel-status-labels.js";

export const NEW_HOTEL_HREF = "/manager/hotels/new";

const NEW_HOTEL_LINK_CLASS =
    "rounded-control bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring inline-flex h-10 items-center justify-center gap-2 px-4 text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

export function buildManagedHotelsHref(page) {
    return `/manager/hotels?page=${page}`;
}

export function NewHotelLink() {
    return (
        <Link href={NEW_HOTEL_HREF} className={NEW_HOTEL_LINK_CLASS}>
            Cadastrar hotel
        </Link>
    );
}

function ManagedHotelItem({ hotel }) {
    return (
        <li className="rounded-card border-border bg-surface flex flex-col gap-2 border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
                <p className="text-foreground font-medium">{hotel.name}</p>
                <p className="text-muted-foreground text-sm">
                    {hotel.category} · CNPJ {formatCnpj(hotel.cnpj)}
                </p>
            </div>
            <Badge tone={getHotelStatusTone(hotel.status)}>
                {getHotelStatusLabel(hotel.status)}
            </Badge>
        </li>
    );
}

export function ManagedHotelList({ items, page, pageSize, total }) {
    if (total === 0) {
        return (
            <EmptyState
                icon={Building2}
                title="Nenhum hotel cadastrado"
                description="Cadastre seu primeiro hotel. Ele começa como rascunho e só é publicado depois da análise do administrador."
                action={<NewHotelLink />}
            />
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <ul className="flex flex-col gap-3">
                {items.map((hotel) => (
                    <ManagedHotelItem key={hotel.id} hotel={hotel} />
                ))}
            </ul>
            <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                buildHref={buildManagedHotelsHref}
            />
        </div>
    );
}
