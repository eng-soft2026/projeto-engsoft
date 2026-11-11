import Link from "next/link";
import { DoorOpen } from "lucide-react";
import { Badge } from "../../../components/ui/badge.jsx";
import { EmptyState } from "../../../components/ui/empty-state.jsx";
import { Pagination } from "../../../components/ui/pagination.jsx";
import { joinClassNames } from "../../../utils/class-names.js";
import { formatPrice } from "../../room-types/room-type-labels.js";
import {
    formatFloor,
    getRoomStatusLabel,
    getRoomStatusTone,
} from "../room-labels.js";
import {
    buildNewRoomHref,
    buildRoomHref,
    buildRoomsHref,
} from "../room-routes.js";

const NEW_ROOM_LINK_CLASS =
    "rounded-control bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring inline-flex h-10 items-center justify-center gap-2 px-4 text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

const UNIT_LINK_CLASS =
    "rounded-control focus-visible:ring-ring inline-flex h-9 items-center border px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none";

const SELECTED_UNIT_LINK_CLASS = "border-primary bg-primary-soft text-primary";

const UNSELECTED_UNIT_LINK_CLASS =
    "border-border text-muted-foreground hover:text-foreground";

export function NewRoomLink({ hotelId, unitId }) {
    return (
        <Link
            href={buildNewRoomHref(hotelId, unitId)}
            className={NEW_ROOM_LINK_CLASS}
        >
            Cadastrar quarto
        </Link>
    );
}

export function UnitSelector({ hotelId, units, selectedUnitId }) {
    return (
        <nav aria-label="Unidades" className="flex flex-wrap gap-2">
            {units.map((unit) => {
                const isSelected = unit.id === selectedUnitId;
                return (
                    <Link
                        key={unit.id}
                        href={buildRoomsHref(hotelId, { unitId: unit.id })}
                        aria-current={isSelected ? "page" : undefined}
                        className={joinClassNames(
                            UNIT_LINK_CLASS,
                            isSelected
                                ? SELECTED_UNIT_LINK_CLASS
                                : UNSELECTED_UNIT_LINK_CLASS,
                        )}
                    >
                        {unit.isActive ? unit.name : `${unit.name} (inativa)`}
                    </Link>
                );
            })}
        </nav>
    );
}

function describePrice(room) {
    const source = room.price === null ? "preço do tipo" : "preço próprio";
    return `${formatPrice(room.effectivePrice)} por noite (${source})`;
}

function ManagedRoomItem({ hotelId, room }) {
    return (
        <li className="rounded-card border-border bg-surface flex flex-col gap-2 border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
                <Link
                    href={buildRoomHref(hotelId, room.id)}
                    className="text-foreground hover:text-primary focus-visible:ring-ring rounded-control font-medium focus-visible:ring-2 focus-visible:outline-none"
                >
                    Quarto {room.number}
                </Link>
                <p className="text-muted-foreground text-sm">
                    {room.roomType.name} · {formatFloor(room.floor)}
                </p>
                <p className="text-foreground text-sm font-medium">
                    {describePrice(room)}
                </p>
            </div>
            <div className="flex flex-wrap gap-2">
                {room.isAccessible && <Badge tone="info">Acessível</Badge>}
                <Badge tone={getRoomStatusTone(room.status)}>
                    {getRoomStatusLabel(room.status)}
                </Badge>
            </div>
        </li>
    );
}

export function ManagedRoomList({
    hotelId,
    unitId,
    items,
    page,
    pageSize,
    total,
    canCreate,
}) {
    if (total === 0) {
        return (
            <EmptyState
                icon={DoorOpen}
                title="Nenhum quarto cadastrado nesta unidade"
                description="Cadastre os quartos físicos com número, andar e tipo de acomodação."
                action={
                    canCreate && (
                        <NewRoomLink hotelId={hotelId} unitId={unitId} />
                    )
                }
            />
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <ul className="flex flex-col gap-3">
                {items.map((room) => (
                    <ManagedRoomItem
                        key={room.id}
                        hotelId={hotelId}
                        room={room}
                    />
                ))}
            </ul>
            <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                buildHref={(nextPage) =>
                    buildRoomsHref(hotelId, { unitId, page: nextPage })
                }
            />
        </div>
    );
}
