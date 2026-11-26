import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "../../../../../components/ui/badge.jsx";
import { Card } from "../../../../../components/ui/card.jsx";
import { MEDIA_SCOPES } from "../../../../../constants/media.js";
import { USER_ROLES } from "../../../../../constants/user-roles.js";
import { NotFoundError } from "../../../../../lib/errors.js";
import { requirePageRole } from "../../../../../modules/auth/guards.js";
import { ADMIN_HOTELS_PATH } from "../../../../../modules/hotels/admin-hotel-filters.js";
import { loadAdminHotelDetail } from "../../../../../modules/hotels/admin-hotel-detail-data.js";
import { AdminHotelActions } from "../../../../../modules/hotels/components/admin-hotel-actions.jsx";
import {
    AdminAmenitiesSection,
    AdminHotelSummary,
    AdminReviewNoteHistory,
    AdminRoomTypesSection,
    AdminUnitsSection,
} from "../../../../../modules/hotels/components/admin-hotel-detail.jsx";
import { HotelAcceptancesForm } from "../../../../../modules/hotels/components/hotel-acceptances-form.jsx";
import { HotelPoliciesPanel } from "../../../../../modules/hotels/components/hotel-policies-panel.jsx";
import {
    getHotelStatusLabel,
    getHotelStatusTone,
} from "../../../../../modules/hotels/hotel-status-labels.js";
import { MediaGallery } from "../../../../../modules/media/components/media-gallery.jsx";
import { hotelParamsSchema } from "../../../../../schemas/hotel-schemas.js";

export const metadata = { title: "Detalhe do hotel | Reserva de Hotéis" };

async function readHotelDetail(admin, hotelId) {
    const params = hotelParamsSchema.safeParse({ id: hotelId });
    if (!params.success) {
        notFound();
    }

    try {
        return await loadAdminHotelDetail(admin, params.data.id);
    } catch (error) {
        if (error instanceof NotFoundError) {
            notFound();
        }
        throw error;
    }
}

export default async function AdminHotelDetailPage({ params }) {
    const admin = await requirePageRole([USER_ROLES.ADMIN]);
    const { id } = await params;
    const detail = await readHotelDetail(admin, id);
    const { hotel } = detail;

    return (
        <>
            <Link
                href={ADMIN_HOTELS_PATH}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-control inline-flex items-center gap-1 self-start text-sm focus-visible:ring-2 focus-visible:outline-none"
            >
                <ArrowLeft aria-hidden="true" className="size-4" />
                Voltar para hotéis
            </Link>
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
                <AdminHotelActions hotelId={hotel.id} status={hotel.status} />
            </header>
            <div className="flex max-w-3xl flex-col gap-6">
                <AdminHotelSummary hotel={hotel} />
                <AdminReviewNoteHistory notes={hotel.reviewNotes} />
                <Card>
                    <MediaGallery
                        scope={MEDIA_SCOPES.HOTEL}
                        targetId={hotel.id}
                        isEditable={false}
                        {...detail.gallery}
                    />
                </Card>
                <AdminUnitsSection units={detail.units} />
                <AdminRoomTypesSection roomTypes={detail.roomTypes} />
                <AdminAmenitiesSection amenities={detail.amenities} />
                <Card>
                    <HotelAcceptancesForm
                        hotelId={hotel.id}
                        isEditable={false}
                        acceptances={detail.acceptances}
                    />
                </Card>
                <Card>
                    <HotelPoliciesPanel
                        hotelId={hotel.id}
                        isEditable={false}
                        policies={detail.policies}
                    />
                </Card>
            </div>
        </>
    );
}
