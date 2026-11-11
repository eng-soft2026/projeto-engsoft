import { Card } from "../../../../../../components/ui/card.jsx";
import { USER_ROLES } from "../../../../../../constants/user-roles.js";
import { requirePageRole } from "../../../../../../modules/auth/guards.js";
import { HotelAcceptancesForm } from "../../../../../../modules/hotels/components/hotel-acceptances-form.jsx";
import { HotelPoliciesPanel } from "../../../../../../modules/hotels/components/hotel-policies-panel.jsx";
import { isHotelEditable } from "../../../../../../modules/hotels/hotel-editability.js";
import { acceptanceService } from "../../../../../../services/acceptance-service.js";
import { policyService } from "../../../../../../services/policy-service.js";
import { loadManagedHotel } from "../load-managed-hotel.js";

export const metadata = {
    title: "Regras e políticas do hotel | Reserva de Hotéis",
};

export default async function HotelPoliciesPage({ params }) {
    const { id } = await params;
    const hotel = await loadManagedHotel(id);
    const manager = await requirePageRole([USER_ROLES.MANAGER]);
    const [acceptances, policies] = await Promise.all([
        acceptanceService.listAcceptances(manager, hotel.id),
        policyService.listPolicies(manager, hotel.id),
    ]);
    const isEditable = isHotelEditable(hotel.status);

    return (
        <div className="flex max-w-2xl flex-col gap-6">
            <Card>
                <HotelAcceptancesForm
                    hotelId={hotel.id}
                    isEditable={isEditable}
                    acceptances={acceptances}
                />
            </Card>
            <Card>
                <HotelPoliciesPanel
                    hotelId={hotel.id}
                    isEditable={isEditable}
                    policies={policies}
                />
            </Card>
        </div>
    );
}
