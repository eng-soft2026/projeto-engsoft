import { Badge } from "../../../components/ui/badge.jsx";
import { HOTEL_STATUSES } from "../../../constants/hotel-statuses.js";
import { isHotelEditable } from "../hotel-editability.js";
import {
    getHotelStatusLabel,
    getHotelStatusTone,
} from "../hotel-status-labels.js";
import { SubmitReviewButton } from "./submit-review-button.jsx";

export const READ_ONLY_NOTICES = Object.freeze({
    [HOTEL_STATUSES.UNDER_REVIEW]:
        "O hotel está em análise. Os dados ficam só para leitura até o administrador concluir a revisão.",
    [HOTEL_STATUSES.PUBLISHED]:
        "O hotel está publicado. Os dados ficam só para leitura; para alterá-los, o administrador precisa devolvê-lo para rascunho.",
    [HOTEL_STATUSES.BLOCKED]:
        "O hotel foi bloqueado pelo administrador. Os dados ficam só para leitura.",
});

const REVIEW_NOTE_DATE_FORMAT = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
});

export function formatReviewNoteDate(value) {
    return REVIEW_NOTE_DATE_FORMAT.format(new Date(value));
}

function ReadOnlyNotice({ status }) {
    const notice = READ_ONLY_NOTICES[status];
    if (!notice) {
        return null;
    }
    return (
        <p
            role="status"
            className="rounded-card border-border bg-muted text-muted-foreground border p-4 text-sm"
        >
            {notice}
        </p>
    );
}

function LatestReviewNote({ note }) {
    if (!note) {
        return null;
    }
    return (
        <section
            aria-labelledby="latest-review-note-title"
            className="rounded-card border-border bg-surface flex flex-col gap-2 border p-4"
        >
            <h2
                id="latest-review-note-title"
                className="text-foreground text-sm font-semibold"
            >
                Última observação do administrador
            </h2>
            <p className="text-muted-foreground text-xs">
                {getHotelStatusLabel(note.fromStatus)} →{" "}
                {getHotelStatusLabel(note.toStatus)} em{" "}
                <time dateTime={new Date(note.createdAt).toISOString()}>
                    {formatReviewNoteDate(note.createdAt)}
                </time>
            </p>
            <p className="text-foreground text-sm whitespace-pre-line">
                {note.notes}
            </p>
        </section>
    );
}

export function ManagedHotelHeader({ hotel }) {
    const isEditable = isHotelEditable(hotel.status);
    const [latestReviewNote] = hotel.reviewNotes ?? [];

    return (
        <div className="flex flex-col gap-4">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2">
                    <h1 className="text-foreground text-2xl font-semibold">
                        {hotel.name}
                    </h1>
                    <Badge
                        tone={getHotelStatusTone(hotel.status)}
                        className="self-start"
                    >
                        {getHotelStatusLabel(hotel.status)}
                    </Badge>
                </div>
                {isEditable && <SubmitReviewButton hotelId={hotel.id} />}
            </header>
            <ReadOnlyNotice status={hotel.status} />
            <LatestReviewNote note={latestReviewNote} />
        </div>
    );
}
