import { Badge } from "../../../components/ui/badge.jsx";
import { Card, CardTitle } from "../../../components/ui/card.jsx";
import { formatPhone } from "../../../utils/brazilian-phone.js";
import { formatCnpj } from "../../../utils/cnpj.js";
import { formatZipCode } from "../../../utils/zip-code.js";
import {
    formatArea,
    formatBeds,
    formatPrice,
} from "../../room-types/room-type-labels.js";
import {
    formatFloor,
    getRoomStatusLabel,
    getRoomStatusTone,
} from "../../rooms/room-labels.js";
import { getHotelStatusLabel } from "../hotel-status-labels.js";
import { formatReviewNoteDate } from "./managed-hotel-header.jsx";

function DetailItem({ label, children }) {
    return (
        <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="text-foreground text-sm">{children}</dd>
        </div>
    );
}

function ActiveBadge({ isActive, activeLabel, inactiveLabel }) {
    return (
        <Badge tone={isActive ? "success" : "warning"}>
            {isActive ? activeLabel : inactiveLabel}
        </Badge>
    );
}

function EmptyText({ children }) {
    return <p className="text-muted-foreground text-sm">{children}</p>;
}

export function formatUnitAddress(address) {
    const complement = address.complement ? ` (${address.complement})` : "";
    return `${address.street}, ${address.number}${complement} · ${address.neighborhood} · ${address.city}/${address.state} · CEP ${formatZipCode(address.zipCode)}`;
}

export function AdminHotelSummary({ hotel }) {
    const managers = hotel.managers ?? [];

    return (
        <Card className="flex flex-col gap-4">
            <CardTitle>Dados do hotel</CardTitle>
            <dl className="grid gap-4 sm:grid-cols-2">
                <DetailItem label="Categoria">{hotel.category}</DetailItem>
                <DetailItem label="CNPJ">{formatCnpj(hotel.cnpj)}</DetailItem>
                <DetailItem label="E-mail">{hotel.email}</DetailItem>
                <DetailItem label="Proprietário">
                    {hotel.owner.name} ({hotel.owner.email})
                </DetailItem>
                <DetailItem label="Gestores adicionais">
                    {managers.length === 0
                        ? "Nenhum"
                        : managers
                              .map(({ name, email }) => `${name} (${email})`)
                              .join(", ")}
                </DetailItem>
                <DetailItem label="Atualizado em">
                    {formatReviewNoteDate(hotel.updatedAt)}
                </DetailItem>
            </dl>
            <div className="flex flex-col gap-1">
                <h3 className="text-muted-foreground text-xs">Descrição</h3>
                <p className="text-foreground text-sm whitespace-pre-line">
                    {hotel.description}
                </p>
            </div>
        </Card>
    );
}

export function AdminReviewNoteHistory({ notes }) {
    return (
        <Card className="flex flex-col gap-4">
            <CardTitle>Histórico de observações</CardTitle>
            {notes.length === 0 ? (
                <EmptyText>Nenhuma observação registrada.</EmptyText>
            ) : (
                <ol className="flex flex-col gap-3">
                    {notes.map((note) => (
                        <li
                            key={note.id}
                            className="border-border flex flex-col gap-1 border-l-2 pl-3"
                        >
                            <p className="text-muted-foreground text-xs">
                                {getHotelStatusLabel(note.fromStatus)} →{" "}
                                {getHotelStatusLabel(note.toStatus)} em{" "}
                                <time
                                    dateTime={new Date(
                                        note.createdAt,
                                    ).toISOString()}
                                >
                                    {formatReviewNoteDate(note.createdAt)}
                                </time>
                            </p>
                            <p className="text-foreground text-sm whitespace-pre-line">
                                {note.notes}
                            </p>
                        </li>
                    ))}
                </ol>
            )}
        </Card>
    );
}

function describeRoomPrice(room) {
    const source = room.price === null ? "preço do tipo" : "preço próprio";
    return `${formatPrice(room.effectivePrice)} por noite (${source})`;
}

function AdminRoomItem({ room }) {
    return (
        <li className="border-border flex flex-col gap-1 border-t pt-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-0.5">
                <p className="text-foreground text-sm font-medium">
                    Quarto {room.number} · {formatFloor(room.floor)}
                    {room.isAccessible ? " · Acessível" : ""}
                </p>
                <p className="text-muted-foreground text-xs">
                    {room.roomType.name} · {describeRoomPrice(room)}
                </p>
            </div>
            <div className="flex gap-2">
                <Badge tone={getRoomStatusTone(room.status)}>
                    {getRoomStatusLabel(room.status)}
                </Badge>
                {!room.isActive && <Badge tone="warning">Inativo</Badge>}
            </div>
        </li>
    );
}

function AdminUnitItem({ unit }) {
    return (
        <li className="rounded-card border-border flex flex-col gap-3 border p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                    <h3 className="text-foreground font-medium">{unit.name}</h3>
                    <p className="text-muted-foreground text-sm">
                        {formatUnitAddress(unit.address)}
                    </p>
                    <p className="text-muted-foreground text-sm">
                        {unit.email} ·{" "}
                        {unit.phones
                            .map(({ phone }) => formatPhone(phone))
                            .join(", ")}
                    </p>
                    <p className="text-muted-foreground text-sm">
                        Check-in {unit.checkInTime} · Check-out{" "}
                        {unit.checkOutTime} · Overbooking{" "}
                        {unit.overbookingPercentage}%
                    </p>
                </div>
                <ActiveBadge
                    isActive={unit.isActive}
                    activeLabel="Ativa"
                    inactiveLabel="Inativa"
                />
            </div>
            {unit.rooms.length === 0 ? (
                <EmptyText>Nenhum quarto cadastrado nesta unidade.</EmptyText>
            ) : (
                <ul
                    aria-label={`Quartos de ${unit.name}`}
                    className="flex flex-col gap-2"
                >
                    {unit.rooms.map((room) => (
                        <AdminRoomItem key={room.id} room={room} />
                    ))}
                </ul>
            )}
        </li>
    );
}

export function AdminUnitsSection({ units }) {
    return (
        <Card className="flex flex-col gap-4">
            <CardTitle>Unidades e quartos</CardTitle>
            {units.length === 0 ? (
                <EmptyText>Nenhuma unidade cadastrada.</EmptyText>
            ) : (
                <ul className="flex flex-col gap-3">
                    {units.map((unit) => (
                        <AdminUnitItem key={unit.id} unit={unit} />
                    ))}
                </ul>
            )}
        </Card>
    );
}

export function AdminRoomTypesSection({ roomTypes }) {
    return (
        <Card className="flex flex-col gap-4">
            <CardTitle>Tipos de acomodação</CardTitle>
            {roomTypes.length === 0 ? (
                <EmptyText>Nenhum tipo de acomodação cadastrado.</EmptyText>
            ) : (
                <ul className="flex flex-col gap-3">
                    {roomTypes.map((roomType) => (
                        <li
                            key={roomType.id}
                            className="rounded-card border-border flex flex-col gap-2 border p-4 sm:flex-row sm:items-start sm:justify-between"
                        >
                            <div className="flex flex-col gap-1">
                                <h3 className="text-foreground font-medium">
                                    {roomType.name}
                                </h3>
                                <p className="text-muted-foreground text-sm">
                                    Até {roomType.maxGuests} hóspedes ·{" "}
                                    {formatArea(roomType.areaM2)} ·{" "}
                                    {formatBeds(roomType.beds)}
                                </p>
                                <p className="text-muted-foreground text-sm">
                                    {formatPrice(roomType.defaultPrice)} por
                                    noite (preço padrão)
                                </p>
                                {roomType.description && (
                                    <p className="text-foreground text-sm whitespace-pre-line">
                                        {roomType.description}
                                    </p>
                                )}
                            </div>
                            <ActiveBadge
                                isActive={roomType.isActive}
                                activeLabel="Ativo"
                                inactiveLabel="Inativo"
                            />
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

export function AdminAmenitiesSection({ amenities }) {
    return (
        <Card className="flex flex-col gap-4">
            <CardTitle>Comodidades do hotel</CardTitle>
            {amenities.length === 0 ? (
                <EmptyText>Nenhuma comodidade associada.</EmptyText>
            ) : (
                <ul className="flex flex-wrap gap-2">
                    {amenities.map((amenity) => (
                        <li key={amenity.id}>
                            <Badge tone={amenity.isGlobal ? "neutral" : "info"}>
                                {amenity.name}
                            </Badge>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}
