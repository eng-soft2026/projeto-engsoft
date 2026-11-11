import Link from "next/link";
import { MapPin } from "lucide-react";
import { Badge } from "../../../components/ui/badge.jsx";
import { EmptyState } from "../../../components/ui/empty-state.jsx";
import { Pagination } from "../../../components/ui/pagination.jsx";
import {
    buildNewUnitHref,
    buildUnitHref,
    buildUnitsHref,
} from "../unit-routes.js";

const NEW_UNIT_LINK_CLASS =
    "rounded-control bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring inline-flex h-10 items-center justify-center gap-2 px-4 text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

export function NewUnitLink({ hotelId }) {
    return (
        <Link href={buildNewUnitHref(hotelId)} className={NEW_UNIT_LINK_CLASS}>
            Cadastrar unidade
        </Link>
    );
}

function ManagedUnitItem({ hotelId, unit }) {
    const { address } = unit;

    return (
        <li className="rounded-card border-border bg-surface flex flex-col gap-2 border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
                <Link
                    href={buildUnitHref(hotelId, unit.id)}
                    className="text-foreground hover:text-primary focus-visible:ring-ring rounded-control font-medium focus-visible:ring-2 focus-visible:outline-none"
                >
                    {unit.name}
                </Link>
                <p className="text-muted-foreground text-sm">
                    {address.street}, {address.number} · {address.city}/
                    {address.state}
                </p>
                <p className="text-muted-foreground text-sm">
                    Check-in {unit.checkInTime} · Check-out {unit.checkOutTime}{" "}
                    · Overbooking {unit.overbookingPercentage}%
                </p>
            </div>
            <Badge tone={unit.isActive ? "success" : "warning"}>
                {unit.isActive ? "Ativa" : "Inativa"}
            </Badge>
        </li>
    );
}

export function ManagedUnitList({
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
                icon={MapPin}
                title="Nenhuma unidade cadastrada"
                description="Cadastre ao menos uma unidade com endereço e telefone para enviar o hotel para análise."
                action={isEditable && <NewUnitLink hotelId={hotelId} />}
            />
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <ul className="flex flex-col gap-3">
                {items.map((unit) => (
                    <ManagedUnitItem
                        key={unit.id}
                        hotelId={hotelId}
                        unit={unit}
                    />
                ))}
            </ul>
            <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                buildHref={(nextPage) => buildUnitsHref(hotelId, nextPage)}
            />
        </div>
    );
}
