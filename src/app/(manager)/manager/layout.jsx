import { AreaLayout } from "../../../components/layout/area-layout.jsx";
import { MANAGER_AREA_NAVIGATION } from "../../../components/layout/navigation-links.js";
import { USER_ROLES } from "../../../constants/user-roles.js";
import { requirePageRole } from "../../../modules/auth/guards.js";

export default async function ManagerLayout({ children }) {
    await requirePageRole([USER_ROLES.MANAGER]);

    return (
        <AreaLayout title="Painel do gestor" items={MANAGER_AREA_NAVIGATION}>
            {children}
        </AreaLayout>
    );
}
