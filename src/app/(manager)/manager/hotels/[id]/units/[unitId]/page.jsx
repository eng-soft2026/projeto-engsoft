import { notFound } from "next/navigation";
import { Badge } from "../../../../../../../components/ui/badge.jsx";
import { Card } from "../../../../../../../components/ui/card.jsx";
import { USER_ROLES } from "../../../../../../../constants/user-roles.js";
import { NotFoundError } from "../../../../../../../lib/errors.js";
import { requirePageRole } from "../../../../../../../modules/auth/guards.js";
import { isHotelEditable } from "../../../../../../../modules/hotels/hotel-editability.js";
import { DeactivateUnitButton } from "../../../../../../../modules/units/components/deactivate-unit-button.jsx";
import { UnitForm } from "../../../../../../../modules/units/components/unit-form.jsx";
import { UnitLocationPanel } from "../../../../../../../modules/units/components/unit-location-panel.jsx";
import { toClientUnit } from "../../../../../../../modules/units/unit-location.js";
import { unitParamsSchema } from "../../../../../../../schemas/unit-schemas.js";
import { unitService } from "../../../../../../../services/unit-service.js";
import { loadManagedHotel } from "../../load-managed-hotel.js";

export const metadata = { title: "Editar unidade | Reserva de Hotéis" };

async function loadHotelUnit(manager, hotelId, unitId) {
    const params = unitParamsSchema.safeParse({ id: unitId });
    if (!params.success) {
        notFound();
    }

    let unit;
    try {
        unit = await unitService.getUnit(manager, params.data.id);
    } catch (error) {
        if (error instanceof NotFoundError) {
            notFound();
        }
        throw error;
    }

    if (unit.hotelId !== hotelId) {
        notFound();
    }
    return toClientUnit(unit);
}

export default async function EditUnitPage({ params }) {
    const { id, unitId } = await params;
    const hotel = await loadManagedHotel(id);
    const manager = await requirePageRole([USER_ROLES.MANAGER]);
    const unit = await loadHotelUnit(manager, hotel.id, unitId);
    const isEditable = isHotelEditable(hotel.status) && unit.isActive;

    return (
        <div className="flex max-w-2xl flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-foreground text-lg font-semibold">
                    {unit.name}
                </h2>
                {!unit.isActive && <Badge tone="warning">Inativa</Badge>}
            </div>
            <Card>
                <UnitForm
                    hotelId={hotel.id}
                    unit={unit}
                    isEditable={isEditable}
                />
            </Card>
            <Card>
                <UnitLocationPanel unit={unit} isEditable={isEditable} />
            </Card>
            {isEditable && <DeactivateUnitButton unit={unit} />}
        </div>
    );
}
