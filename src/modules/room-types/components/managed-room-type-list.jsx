import Link from "next/link";
import { BedDouble } from "lucide-react";
import { Badge } from "../../../components/ui/badge.jsx";
import { EmptyState } from "../../../components/ui/empty-state.jsx";
import { Pagination } from "../../../components/ui/pagination.jsx";
import { formatArea, formatBeds, formatPrice } from "../room-type-labels.js";
import {
    buildNewRoomTypeHref,
    buildRoomTypeHref,
    buildRoomTypesHref,
} from "../room-type-routes.js";

const NEW_ROOM_TYPE_LINK_CLASS =
    "rounded-control bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring inline-flex h-10 items-center justify-center gap-2 px-4 text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

export function NewRoomTypeLink({ hotelId }) {
    return (
        <Link
            href={buildNewRoomTypeHref(hotelId)}
            className={NEW_ROOM_TYPE_LINK_CLASS}
        >
            Cadastrar tipo
        </Link>
    );
}

function ManagedRoomTypeItem({ hotelId, roomType }) {
    return (
        <li className="rounded-card border-border bg-surface flex flex-col gap-2 border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
                <Link
                    href={buildRoomTypeHref(hotelId, roomType.id)}
                    className="text-foreground hover:text-primary focus-visible:ring-ring rounded-control font-medium focus-visible:ring-2 focus-visible:outline-none"
                >
                    {roomType.name}
                </Link>
                <p className="text-muted-foreground text-sm">
                    Até {roomType.maxGuests} hóspedes ·{" "}
                    {formatArea(roomType.areaM2)} · {formatBeds(roomType.beds)}
                </p>
                <p className="text-foreground text-sm font-medium">
                    {formatPrice(roomType.defaultPrice)} por noite
                </p>
            </div>
            <Badge tone={roomType.isActive ? "success" : "warning"}>
                {roomType.isActive ? "Ativo" : "Inativo"}
            </Badge>
        </li>
    );
}

export function ManagedRoomTypeList({
    hotelId,
    items,
    page,
    pageSize,
    total,
    isEditable,
}) {
    if (total === 0) {
        return (
            <EmptyState
                icon={BedDouble}
                title="Nenhum tipo de acomodação cadastrado"
                description="Cadastre os tipos com camas, capacidade, área e preço padrão para depois criar os quartos."
                action={isEditable && <NewRoomTypeLink hotelId={hotelId} />}
            />
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <ul className="flex flex-col gap-3">
                {items.map((roomType) => (
                    <ManagedRoomTypeItem
                        key={roomType.id}
                        hotelId={hotelId}
                        roomType={roomType}
                    />
                ))}
            </ul>
            <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                buildHref={(nextPage) => buildRoomTypesHref(hotelId, nextPage)}
            />
        </div>
    );
}
